/**
 * The renderer. State in, one SVG document per side out.
 *
 * Every piece of text is a path. The preview and every export are made
 * from the same output, with `preview: true` adding a rounded mask, a
 * hairline edge, and hatching where content overflowed.
 *
 * Visual grammar (see AGENTS.md, Card design intent): the band is the one
 * loud element and carries the name and key facts, with the condition on a
 * yellow strip beneath it. Sections are anchored by a small icon and a caps
 * label in ink. Proximity groups, not rules or boxes. Numbers
 * are tabular and right-aligned where they are the thing to find.
 */
import { colours as baseColours, palettes, type, compactType, geometry, floors, PT } from './tokens.js';
import { formatFor } from './formats/index.js';
import { layoutFor } from './layouts/index.js';
import { pick, lines as splitLines, resolveLanguage, isoToday } from './state.js';
import { layoutText, lineHeight } from './text/paragraph.js';
import { linePath } from './text/outline.js';
import { emblemMarkup } from './emblem.js';
import { iconMarkup, inlineIconMarkup } from './icons.js';
import { mecardFor, qrMarkup, MODULE_MIN, normalisePhone } from './qr.js';

const XMLNS = 'http://www.w3.org/2000/svg';
const f = (n) => Math.round(n * 1000) / 1000;
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const DIGITS = ['tnum'];

// The type floors hold for every style, checked once when the module loads.
for (const [name, style] of Object.entries({ ...type, ...compactType })) {
  const floor = style.caps && style.weight >= 700 ? floors.minLabelPt : floors.minBodyPt;
  if (style.size < floor) throw new Error(`Type style ${name} is ${style.size} pt, below the ${floor} pt floor`);
  if ((style.leading ?? 1.2) < floors.minLeading) throw new Error(`Type style ${name} leading ${style.leading} is below ${floors.minLeading}`);
}
/** Baseline position within the em box as a fraction of the em. Cap height comes from the font. */
const BASELINE = 0.78;

/**
 * @param {object} state card state (see state.js)
 * @param {object} ctx
 * @param {ReturnType<import('./text/shaper.js').createShaper>} ctx.shaper
 * @param {Record<string, Record<string, string>>} ctx.strings card strings by language
 * @param {Record<string, object>} ctx.numbers emergency numbers by country
 * @param {boolean} [ctx.preview]
 * @param {string} [ctx.watermark] preview only, a word drawn across each side, such as Example
 */
/** The card's colours for a theme. Module-level so blocks read the same set the side was started with. */
let colours = baseColours;

export function renderCard(state, ctx) {
  const palette = palettes[state.theme] ?? palettes.red;
  colours = { ...baseColours, alert: palette.alert, condition: palette.condition };
  const format = formatFor(state.format);
  const layout = layoutFor(state.mode);
  const sides = {};
  for (const sideId of format.sides) {
    const spec = layout.sides[sideId];
    const lang = resolveLanguage(spec.language, state);
    const strings = ctx.strings[lang] ?? ctx.strings.en;
    sides[sideId] = renderSide({ state, ctx, format, spec, lang, strings, sideId });
  }
  const overflow = [...new Set(Object.values(sides).flatMap((s) => s.overflow))];
  const missing = {};
  for (const side of Object.values(sides)) {
    for (const [field, chars] of Object.entries(side.missing)) {
      missing[field] = [...new Set([...(missing[field] ?? []), ...chars])];
    }
  }
  const incomplete = requiredMissing(state, ctx);
  return {
    format,
    sides,
    overflow,
    missing,
    incomplete,
    ok: overflow.length === 0 && Object.keys(missing).length === 0 && incomplete.length === 0,
  };
}

/**
 * Required fields that are still empty, as field ids. A card that lacks one
 * cannot be downloaded. Medicines, allergies, and the rest print "None".
 */
export function requiredMissing(state, ctx) {
  const empty = (text) => !pick(text, 'en').trim();
  const primary = state.conditions.find((c) => c.primary) ?? state.conditions[0];
  const out = [];
  if (empty(state.person.name)) out.push('name');
  const year = Number(state.person.birthYear);
  if (!/^\d{4}$/.test(state.person.birthYear ?? '') || year < 1900 || year > new Date().getFullYear()) out.push('birthYear');
  if (empty(primary?.name)) out.push('condition');
  if (!splitLines(pick(state.do, 'en')).length) out.push('do');
  if (!splitLines(pick(state.doNot, 'en')).length) out.push('doNot');
  // A number a phone can dial, the same test the QR code uses.
  if (!state.contacts.some((c) => normalisePhone(c.phone).replace('+', '').length >= 6)) out.push('contactPhone');
  if (!emergencyEntry(state, ctx)) out.push('emergency');
  return out;
}

/** "Sep 2026" in the side's language with Latin digits, from an ISO date. */
function monthYear(iso, lang) {
  const [y, m] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, 15));
  try {
    return new Intl.DateTimeFormat(`${lang}-u-nu-latn`, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
  } catch {
    return `${y}-${String(m).padStart(2, '0')}`;
  }
}

/** The optional date, or null. `ctx.today` is an ISO date, today by default. */
function updatedText(state, ctx, lang, strings) {
  if (!state.showDate) return null;
  return `${strings.updated} ${monthYear(ctx.today ?? isoToday(), lang)}`;
}

function renderSide({ state, ctx, format, spec, lang, strings, sideId }) {
  // Ids are suffixed with the side, since both SVGs share one document in the editor.
  const id = (name) => `${name}-${sideId}`;
  // Formats may draw on a smaller canvas that the SVG scales up to its physical size.
  const canvas = format.canvas ?? { width: format.width, height: format.height, scale: 1 };
  const { width: W, height: H } = canvas;
  const compact = Boolean(spec.compact);
  const T = compact ? compactType : type;
  const region = spec.band ? (compact ? format.regions.bodyBelowCompact : format.regions.bodyBelowBand) : format.regions.bodyFull;
  const missing = {};
  const overflow = [];
  const tc = textContext(ctx.shaper, lang, missing);
  const args = { state, lang, strings, tc, ctx, T };

  const body = [];
  let y = region.y;
  const bottom = region.y + region.h;
  let firstOverflowY = null;
  // Values in key-value rows start where the second column of a two-column
  // row starts, so everything on the side shares one value column.
  const tabX = region.x + (region.w - geometry.gutter) / 2 + geometry.gutter;

  // The first row on a side with a corner emblem stops short of it.
  const reserve = spec.cornerEmblem && state.emblem !== 'none' ? geometry.emblemCorner + 1.5 : 0;

  // Optional QR code in the top-right corner, left of the emblem. It sits in
  // the predictable gap beside the medication timings. Rows that reach its
  // height stop short of it, so nothing is ever printed underneath.
  const qrText = spec.qr && state.qr?.on ? mecardFor(state, ctx.strings.en) : null;
  const qrSize = (state.qr?.size ?? geometry.qr) / canvas.scale;
  const qrBox = qrText ? qrSize + geometry.qrQuiet : 0;
  const qrBottom = region.y + qrBox;
  const qrParts = [];
  let qrTooSmall = false;
  if (qrText) {
    const q = qrMarkup(qrText, region.x + region.w - reserve - qrSize, region.y, qrSize, colours.ink);
    qrParts.push(q.markup);
    qrTooSmall = q.moduleMm < MODULE_MIN;
  }
  const blockArgs = { ...args };

  for (const [rowIndex, block] of spec.blocks.entries()) {
    const ids = typeof block === 'string' ? [block] : block.columns;
    const weights = block.widths ?? ids.map(() => 1);
    const total = weights.reduce((a, b) => a + b, 0);
    // `reserveW` is taken from the last column only, so the columns on the
    // left keep their width and their shared value column.
    const layoutRow = (reserveW) => {
      const free = region.w - geometry.gutter * (ids.length - 1);
      let rowH = 0;
      const rowParts = [];
      const wide = [];
      let x = region.x;
      ids.forEach((id, i) => {
        const colW = (free * weights[i]) / total - (i === ids.length - 1 ? reserveW : 0);
        const r = renderBlock(id, { ...blockArgs, x, y, w: colW, tabX });
        if (r) {
          rowParts.push(...r.parts);
          rowH = Math.max(rowH, r.height);
          if (r.tooWide) wide.push(id);
        }
        x += colW + geometry.gutter;
      });
      return { rowH, rowParts, wide };
    };
    // Only the first row shares its line with the code and the emblem. Any
    // later row that would reach the code starts below it instead.
    if (qrText && rowIndex > 0 && y < qrBottom + 1e-6) y = qrBottom + 0.6;
    const row = layoutRow(rowIndex === 0 ? reserve + (qrText ? qrBox + geometry.gutter : 0) : 0);
    const { rowH, rowParts } = row;
    overflow.push(...row.wide);
    if (rowH === 0) continue;
    const fits = y + rowH <= bottom + 1e-6;
    if (!fits) {
      overflow.push(...ids);
      if (firstOverflowY === null) firstOverflowY = y;
    }
    if (fits || ctx.preview) body.push(...rowParts);
    y += rowH + geometry.blockGap;
  }
  if (qrTooSmall) overflow.push('qr');
  const contentHeight = Math.max(0, y - geometry.blockGap - region.y);

  // The optional date sits in the bottom-right corner, which is usually
  // empty. It takes no row. Content that reaches its line is an overflow.
  const dated = spec.date ? updatedText(state, ctx, lang, strings) : null;
  if (dated) {
    const top = bottom - lineHeight(T.label);
    const d = tc.text('updated', dated, T.label, region.x, top, region.w, { align: 'right', features: DIGITS });
    body.push(...d.parts);
    if (region.y + contentHeight > top - geometry.labelGap) overflow.push('updated');
  }
  const fill = contentHeight / region.h;

  const parts = [];
  parts.push(`<rect width="${f(W)}" height="${f(H)}" fill="${colours.paper}"/>`);
  if (spec.cornerEmblem && state.emblem !== 'none') {
    const size = geometry.emblemCorner;
    parts.push(emblemMarkup(state.emblem, W - region.x - size, region.y, size));
  }
  parts.push(...qrParts);
  if (spec.band) {
    const band = compact ? renderCompactBand({ ...args, format }) : renderBand({ ...args, format });
    const strip = renderStrip({ ...args, format, compact });
    parts.push(...band.parts, ...strip.parts);
    overflow.push(...band.overflow, ...strip.overflow);
  }

  // A framed format (the phone) draws its panel on a ground, so the panel
  // keeps its rounded corners in the export too. A printed card is cut to
  // shape and needs no clip.
  const frame = format.frame ?? null;
  const clipCard = ctx.preview || Boolean(frame);
  const defs = [];
  if (clipCard) defs.push(`<clipPath id="${id('card')}"><rect width="${f(W)}" height="${f(H)}" rx="${f(format.cornerRadius)}"/></clipPath>`);
  if (ctx.preview) {
    parts.push(`<g clip-path="url(#${id('body')})">${body.join('')}</g>`);
    defs.push(
      `<clipPath id="${id('body')}"><rect x="${f(region.x)}" y="${f(region.y)}" width="${f(region.w)}" height="${f(region.h)}"/></clipPath>`,
      `<pattern id="${id('hatch')}" width="1.2" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="0.5" height="1.2" fill="${colours.alert}" fill-opacity="0.35"/></pattern>`,
    );
    if (firstOverflowY !== null) {
      const top = Math.max(region.y, bottom - 3);
      parts.push(
        `<rect x="${f(region.x)}" y="${f(top)}" width="${f(region.w)}" height="${f(bottom - top)}" fill="url(#${id('hatch')})"/>`,
      );
    }
  } else {
    parts.push(...body);
  }

  // A watermark across the side, in the preview only, so an example card cannot pass for a real one.
  if (ctx.preview && ctx.watermark) {
    const style = { size: 30, leading: 1.2, weight: 700, caps: true, tracking: 200 };
    const laid = tc.measure('watermark', ctx.watermark, style, W * 2);
    const lw = laid.lines[0]?.width ?? 0;
    const painted = tc.paint(laid.lines, (W - lw) / 2, (H - lineHeight(style)) / 2, style, colours.ink);
    parts.push(`<g opacity="0.14" transform="rotate(-18 ${f(W / 2)} ${f(H / 2)})">${painted.parts.join('')}</g>`);
  }

  const inner =
    (defs.length ? `<defs>${defs.join('')}</defs>` : '') +
    (clipCard ? `<g clip-path="url(#${id('card')})">${parts.join('')}</g>` : parts.join(''));
  const edge = ctx.preview
    ? `<rect x="0.1" y="0.1" width="${f(W - 0.2)}" height="${f(H - 0.2)}" rx="${f(format.cornerRadius)}" fill="none" stroke="${colours.ruleMuted}" stroke-opacity="0.5" stroke-width="0.2"/>`
    : '';
  const units = format.units ?? 'mm';
  const view = frame ? `0 0 ${f(frame.width)} ${f(frame.height)}` : `0 0 ${f(W)} ${f(H)}`;
  const panel = inner + edge;
  const svg =
    `<svg xmlns="${XMLNS}" width="${f(format.width)}${units}" height="${f(format.height)}${units}" viewBox="${view}">` +
    (frame
      ? `<rect width="${f(frame.width)}" height="${f(frame.height)}" fill="${frame.ground}"/><g transform="translate(${f(frame.x)} ${f(frame.y)})">${panel}</g>`
      : panel) +
    `</svg>`;

  return { svg, overflow: [...new Set(overflow)], missing, fill, lang };
}

/* ── Band ───────────────────────────────────────────────────────────── */

/**
 * Emblem, alert label, and the name on the left. Year of birth and blood
 * group as chips on the right, level with the name.
 */
function renderBand({ format, state, lang, strings, tc }) {
  const b = format.regions.band;
  const parts = [`<rect x="0" y="0" width="${f(b.w)}" height="${f(b.h)}" fill="${colours.alert}"/>`];
  const overflow = [];
  let x = b.inset;
  const blockH = lineHeight(type.alert) + 0.4 + lineHeight(type.name);
  if (state.emblem !== 'none') {
    const size = geometry.emblem;
    parts.push(emblemMarkup(state.emblem, x, Math.max(b.inset, b.inset + (blockH - size) / 2), size));
    x += size + 2;
  }
  const right = b.w - b.inset;

  // Line 1, alert label
  const label = tc.text('alert', strings.alert, type.alert, x, b.inset, right - x, { colour: colours.alertInk });
  parts.push(...label.parts);
  let y = b.inset + label.height + 0.4;

  // Chips, right-aligned on the name line
  const { parts: chipParts, left: cx } = renderChips({ state, strings, tc, right, centre: y + lineHeight(type.name) / 2, colour: colours.alertInk });

  // Line 2, the name
  const nameW = cx - x;
  const name = tc.text('name', pick(state.person.name, lang), type.name, x, y, nameW, { colour: colours.alertInk });
  parts.push(...name.parts, ...chipParts);
  if (name.lines > 1 || name.tooWide) overflow.push('name');
  return { parts, overflow };
}

/**
 * The condition strip. Icon, then the caps label and the primary condition
 * joined by an en dash, on a solid yellow directly under the band.
 */
function renderStrip({ format, state, lang, strings, tc, compact }) {
  const s = compact ? format.regions.stripCompact : format.regions.strip;
  const parts = [`<rect x="0" y="${f(s.y)}" width="${f(s.w)}" height="${f(s.h)}" fill="${colours.condition}"/>`];
  const overflow = [];
  const primary = state.conditions.find((c) => c.primary) ?? state.conditions[0];
  const name = pick(primary?.name, lang);
  const iconSize = geometry.conditionIcon;
  const lh = lineHeight(type.condition);
  // Icon, label, a hairline divider, then the value, all on one line.
  const top = s.y + (s.h - lh) / 2;
  const centre = top + lh / 2;
  let x = s.inset;
  parts.push(conditionIcon(primary?.icon, x, centre - iconSize / 2, iconSize));
  x += iconSize + 0.9;
  // Label, an en dash, and the name as one line, so a long name has the full width.
  let right = s.w - s.inset;
  if (compact) {
    const chips = renderChips({ state, strings, tc, right, centre: s.y + s.h / 2, colour: colours.ink, iconOnly: true });
    parts.push(...chips.parts);
    right = chips.left - 1;
  }
  const text = `${strings.condition} \u2013 ${name || strings.none}`;
  const value = tc.text('condition', text, type.condition, x, top, right - x);
  parts.push(...value.parts);
  if (value.lines > 1 || value.tooWide) overflow.push('condition');
  return { parts, overflow };
}

/** Year of birth and blood group as outlined chips, right-aligned, centred on `centre`. */
function renderChips({ state, strings, tc, right, centre, colour, iconOnly = false }) {
  const chips = [];
  // Compact sides drop the word BORN for a calendar icon, since a translated label can be long.
  if (state.person.birthYear) chips.push(iconOnly ? { text: state.person.birthYear, icon: 'born' } : { text: `${strings.born} ${state.person.birthYear}` });
  if (state.person.bloodGroup?.trim()) chips.push({ text: state.person.bloodGroup.trim(), icon: 'blood' });
  const chipH = lineHeight(type.chip) + 1.2;
  let cx = right;
  const parts = [];
  for (const chip of chips.reverse()) {
    const laid = tc.measure('chips', chip.text, type.chip, 40, DIGITS);
    const textW = Math.max(0, ...laid.lines.map((l) => l.width));
    const iconW = chip.icon ? geometry.labelIcon + 0.6 : 0;
    const w = textW + iconW + 2.4;
    cx -= w;
    const top = centre - chipH / 2;
    parts.push(`<rect x="${f(cx)}" y="${f(top)}" width="${f(w)}" height="${f(chipH)}" rx="1" fill="none" stroke="${colour}" stroke-width="${f(geometry.rule)}"/>`);
    if (chip.icon) parts.push(iconMarkup(chip.icon, cx + 1.2, tc.capCentre(top + 0.6, type.chip) - geometry.labelIcon / 2, geometry.labelIcon, colour));
    parts.push(...tc.paint(laid.lines, cx + 1.2 + iconW, top + 0.6, type.chip, colour).parts);
    cx -= 1.2;
  }
  return { parts, left: cx };
}

/**
 * One-line band for compact sides: emblem, alert label, and the name on a
 * single line. The chips move onto the strip.
 */
function renderCompactBand({ format, state, lang, strings, tc, T }) {
  const b = format.regions.bandCompact;
  const parts = [`<rect x="0" y="0" width="${f(b.w)}" height="${f(b.h)}" fill="${colours.alert}"/>`];
  const overflow = [];
  const centre = b.h / 2;
  let x = b.inset;
  if (state.emblem !== 'none') {
    const size = geometry.emblemCompact;
    parts.push(emblemMarkup(state.emblem, x, centre - size / 2, size));
    x += size + 1.5;
  }
  const label = tc.text('alert', strings.alert, T.alert, x, centre - tc.capCentre(0, T.alert), b.w - x - b.inset, { colour: colours.alertInk });
  parts.push(...label.parts);
  x += label.width + 2.5;
  const name = tc.text('name', pick(state.person.name, lang), T.name, x, centre - tc.capCentre(0, T.name), b.w - x - b.inset, { colour: colours.alertInk });
  parts.push(...name.parts);
  if (name.lines > 1 || name.tooWide) overflow.push('name');
  return { parts, overflow };
}

/* ── Text helpers ───────────────────────────────────────────────────── */

/** Shared text helpers for one side. Records missing glyphs per field. */
function textContext(shaper, lang, missing) {
  const record = (field, chars) => {
    if (!chars.size) return;
    missing[field] = [...new Set([...(missing[field] ?? []), ...chars])];
  };
  return {
    lang,
    measure(field, text, style, w, features) {
      const r = layoutText(shaper, text ?? '', style, w, lang, features);
      record(field, r.missing);
      return r;
    },
    /** Vertical centre of capital letters on the first line of text starting at `top`. */
    capCentre(top, style) {
      const lh = lineHeight(style);
      const em = style.size * PT;
      return top + (lh - em) / 2 + em * (BASELINE - shaper.capHeight(style.weight) / 2);
    },
    paint(lines, x, top, style, colour = colours.ink, align = 'left', w = 0) {
      const lh = lineHeight(style);
      const em = style.size * PT;
      const baseline0 = top + (lh - em) / 2 + em * BASELINE;
      const parts = lines.map((line, i) => {
        const lx = align === 'right' ? x + w - line.width : x;
        const d = linePath(shaper, line, lx, baseline0 + i * lh, style);
        return d ? `<path d="${d}" fill="${colour}"/>` : '';
      });
      return { parts, height: lines.length * lh };
    },
    /** Measure and paint in one go. */
    text(field, text, style, x, top, w, { colour, features, align } = {}) {
      const laid = this.measure(field, text, style, w, features);
      const painted = this.paint(laid.lines, x, top, style, colour, align, w);
      return { parts: painted.parts, height: painted.height, tooWide: laid.tooWide, lines: laid.lines.length, width: Math.max(0, ...laid.lines.map((l) => l.width)) };
    },
  };
}

/* ── Blocks ─────────────────────────────────────────────────────────── */

function renderBlock(id, args) {
  const fn = blocks[id];
  if (!fn) throw new Error(`Unknown block: ${id}`);
  return fn(args);
}

/**
 * Icon and caps label, then items. Items are strings (paragraphs),
 * `{ text, style, features }`, `{ marker, text }` for an item with a
 * hanging check or cross, or `{ left, right }` for a name-left, value-right row.
 */
function section({ tc, x, y, w, field, label, icon, items, T = type, style = T.body, labelStyle = T.label, colour = colours.ink, colourItems = false, features, tabX }) {
  const parts = [];
  let cy = y;
  let tooWide = false;
  if (label) {
    const iconSize = geometry.labelIcon;
    const rowH = Math.max(lineHeight(labelStyle), iconSize);
    const centre = cy + rowH / 2;
    let lx = x;
    if (icon) {
      parts.push(iconMarkup(icon, x, centre - iconSize / 2, iconSize, colour));
      lx += iconSize + 0.9;
    }
    const r = tc.text(field, label, labelStyle, lx, centre - tc.capCentre(0, labelStyle), w - (lx - x), { colour });
    parts.push(...r.parts);
    // A label that wraps in a narrow column takes its full height.
    cy += Math.max(rowH, r.height) + geometry.labelGap;
  }
  let tab = tabX;
  if (tabX) {
    const needs = items.filter((it) => it && it.right != null).map((it) => tc.measure(field, it.right, it.rightStyle ?? T.bodyBold, 1000, DIGITS).lines[0]?.width ?? 0);
    if (needs.length) tab = Math.max(x + 14, Math.min(tabX, x + w - Math.max(...needs)));
  }
  for (const item of items) {
    const r = paintItem(tc, field, item, x, cy, w, style, features, tab, colourItems ? colour : colours.ink, T);
    parts.push(...r.parts);
    cy += r.height;
    tooWide = tooWide || r.tooWide;
  }
  return { parts, height: cy - y, tooWide };
}

function paintItem(tc, field, item, x, y, w, style, features, tabX, colour = colours.ink, T = type) {
  if (typeof item === 'string') return tc.text(field, item, style, x, y, w, { features, colour });
  if (item.marker) {
    // A check or cross in place of a number, hanging in the indent.
    const indent = geometry.hangingIndent;
    const size = geometry.markerIcon;
    const mark = iconMarkup(item.marker, x, tc.capCentre(y, style) - size / 2, size, colour);
    const body = tc.text(field, item.text, item.style ?? style, x + indent, y, w - indent, { features, colour });
    return { parts: [mark, ...body.parts], height: body.height, tooWide: body.tooWide };
  }
  if (item.right != null) {
    // Name left, value in the side's shared value column, so values line up
    // with the second column of two-column rows. Narrow blocks fall back to one line.
    const rs = item.rightStyle ?? T.bodyBold;
    if (tabX && tabX - x >= 14 && x + w - tabX >= 12) {
      // The block chose a tab every value fits after, so numbers never break.
      const left = tc.text(field, item.left, item.style ?? style, x, y, tabX - x - 1.5, { features });
      const right = tc.text(field, item.right, rs, tabX, y, x + w - tabX, { features: DIGITS });
      return { parts: [...left.parts, ...right.parts], height: Math.max(left.height, right.height), tooWide: left.tooWide || right.tooWide };
    }
    // No room for two columns: the value goes on its own line, never broken.
    const left = tc.text(field, item.left, item.style ?? style, x, y, w, { features });
    const right = tc.text(field, item.right, rs, x, y + left.height, w, { features: DIGITS });
    return { parts: [...left.parts, ...right.parts], height: left.height + right.height, tooWide: left.tooWide || right.tooWide };
  }
  return tc.text(field, item.text, item.style ?? style, x, y, w, { features: item.features ?? features });
}

const marked = (items, marker) => items.map((text) => ({ marker, text }));
/** A section with nothing in it says so in plain text, so no heading stands alone. */
const orNone = (items, strings) => (items.length ? items : [strings.none]);

const blocks = {
  do({ state, lang, strings, tc, x, y, w, tabX, T }) {
    return section({ tc, x, y, w, tabX, T, field: 'do', label: strings.do, icon: 'do', colour: colours.do, colourItems: true, items: orNone(marked(splitLines(pick(state.do, lang)), 'doItem'), strings) });
  },

  doNot({ state, lang, strings, tc, x, y, w, tabX, T }) {
    return section({ tc, x, y, w, tabX, T, field: 'doNot', label: strings.doNot, icon: 'doNot', colour: colours.doNot, colourItems: true, items: orNone(marked(splitLines(pick(state.doNot, lang)), 'doNotItem'), strings) });
  },

  carries({ state, lang, strings, tc, x, y, w, tabX, T }) {
    const text = pick(state.carries, lang);
    if (!text.trim()) return null;
    return section({ tc, x, y, w, tabX, T, field: 'carries', label: strings.carries, icon: 'carries', items: [text] });
  },

  medications({ state, lang, strings, tc, x, y, w, tabX, T }) {
    const items = state.medications
      .filter((m) => pick(m.name, lang).trim())
      .map((m) => ({ left: pick(m.name, lang), right: [m.dose, pick(m.frequency, lang)].filter((s) => s && s.trim()).join(' · '), rightStyle: T.body }));
    return section({ tc, x, y, w, tabX, T, field: 'medications', label: strings.medications, icon: 'medications', items: orNone(items, strings) });
  },

  allergies({ state, lang, strings, tc, x, y, w, tabX, T }) {
    const items = splitLines(pick(state.allergies, lang));
    // "None known" and not "None". A stranger should not read it as a promise.
    const content = items.length ? items : [strings.noneKnown];
    return section({ tc, x, y, w, tabX, T, field: 'allergies', label: strings.allergies, icon: 'allergies', items: content });
  },

  contacts({ state, lang, strings, tc, x, y, w, tabX, T }) {
    const items = state.contacts
      .filter((c) => pick(c.name, lang).trim() || c.phone?.trim())
      .map((c) => {
        const rel = pick(c.relationship, lang);
        const left = rel ? `${pick(c.name, lang)} (${rel})` : pick(c.name, lang);
        return { left, right: c.phone ?? '' };
      });
    return section({ tc, x, y, w, tabX, T, field: 'contacts', label: strings.contacts, icon: 'contacts', items: orNone(items, strings) });
  },

  contactsAndEmergency(args) {
    const contacts = blocks.contacts(args);
    const entry = emergencyEntry(args.state, args.ctx);
    if (!entry) return contacts;
    const line = paintItem(args.tc, 'emergency', { left: args.strings.emergency, right: emergencyText(entry, args.strings) }, args.x, args.y + contacts.height, args.w, args.T.body, undefined, args.tabX, colours.ink, args.T);
    return { parts: [...contacts.parts, ...line.parts], height: contacts.height + line.height, tooWide: contacts.tooWide || line.tooWide };
  },

  hospital({ state, lang, strings, tc, x, y, w, tabX, T }) {
    const text = pick(state.hospital, lang);
    if (!text.trim()) return null;
    return section({ tc, x, y, w, tabX, T, field: 'hospital', label: strings.hospital, icon: 'hospital', items: [text] });
  },

  otherConditions({ state, lang, strings, tc, x, y, w, tabX, T }) {
    const others = state.conditions.filter((c) => !c.primary).map((c) => pick(c.name, lang)).filter((s) => s.trim());
    const items = [...others, ...splitLines(pick(state.otherConditions, lang))];
    if (!items.length) return null;
    return section({ tc, x, y, w, tabX, T, field: 'otherConditions', label: strings.otherConditions, icon: 'otherConditions', items });
  },

  emergency({ state, strings, tc, ctx, x, y, w, tabX, T }) {
    const entry = emergencyEntry(state, ctx);
    if (!entry) return null;
    return section({ tc, x, y, w, tabX, T, field: 'emergency', label: strings.emergency, icon: 'emergency', items: [{ text: emergencyText(entry, strings), style: T.bodyBold, features: DIGITS }] });
  },

  address({ state, lang, strings, tc, x, y, w, tabX, T }) {
    if (!state.person.showAddress) return null;
    const text = pick(state.person.address, lang);
    if (!text.trim()) return null;
    return section({ tc, x, y, w, tabX, T, field: 'address', label: strings.address, icon: 'address', items: [text] });
  },
};

function emergencyText(entry, strings) {
  const bits = [entry.general];
  if (entry.ambulance) bits.push(`${strings.ambulance} ${entry.ambulance}`);
  return bits.join(' · ');
}

/** The numbers to print: what the person entered, else the table's entry for their country. */
function emergencyEntry(state, ctx) {
  const typed = state.emergency.general?.trim();
  if (typed) return { general: typed, ambulance: state.emergency.ambulance?.trim() || null };
  return ctx.numbers?.[state.emergency.country] ?? null;
}

function conditionIcon(icon, x, y, size) {
  if (icon?.kind === 'lucide' && icon.node) return inlineIconMarkup(icon, x, y, size, colours.ink);
  if (icon?.kind === 'symbol' && icon.markup) {
    // A Commons symbol keeps its own colours, fitted into the square.
    const [vx, vy, vw, vh] = String(icon.viewBox).split(/[\s,]+/).map(Number);
    const k = Math.min(size / vw, size / vh);
    const tx = x + (size - vw * k) / 2 - vx * k;
    const ty = y + (size - vh * k) / 2 - vy * k;
    return `<g transform="translate(${f(tx)} ${f(ty)}) scale(${f(k)})">${icon.markup}</g>`;
  }
  if (icon?.kind === 'upload' && icon.dataUrl) {
    return `<image href="${esc(icon.dataUrl)}" x="${f(x)}" y="${f(y)}" width="${f(size)}" height="${f(size)}" preserveAspectRatio="xMidYMid meet"/>`;
  }
  return iconMarkup('condition', x, y, size, colours.ink);
}

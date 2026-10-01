/**
 * Line breaking over shaped glyphs.
 *
 * Break opportunities come from Intl.Segmenter at word granularity, so
 * space-delimited and dictionary-broken scripts behave the same way.
 * Widths come from shaped advances. A line never breaks inside a cluster.
 */
import { PT } from '../tokens.js';

/** Millimetres per font unit for a style. */
export function unitScale(style, upem) {
  return (style.size * PT) / upem;
}

/** Extra advance per glyph from tracking, in millimetres. */
export function trackingMm(style) {
  return ((style.tracking ?? 0) / 1000) * style.size * PT;
}

/** Line height in millimetres. */
export function lineHeight(style) {
  return style.size * (style.leading ?? 1.2) * PT;
}

function glyphWidth(glyph, style) {
  return glyph.ax * unitScale(style, glyph.font.upem) + trackingMm(style);
}

/**
 * Lay out one paragraph (no newlines) into lines no wider than maxWidth.
 *
 * @param {ReturnType<import('./shaper.js').createShaper>} shaper
 * @param {string} text
 * @param {object} style a `type` token from tokens.js
 * @param {number} maxWidth mm
 * @param {string} lang BCP 47, used for casing and segmentation
 * @param {string[]} [features]
 * @returns {{lines: {glyphs: object[], width: number}[], missing: Set<string>, tooWide: boolean}}
 */
export function layoutParagraph(shaper, text, style, maxWidth, lang, features = []) {
  const source = style.caps ? text.toLocaleUpperCase(lang) : text;
  const { glyphs, missing } = shaper.shapeText(source, style.weight, features);
  const lines = [];
  let tooWide = false;
  if (glyphs.length === 0) return { lines, missing, tooWide };

  const words = glue(segments(source, lang, 'word')).map((seg) => withGlyphs(seg, glyphs, style));

  let line = { glyphs: [], width: 0 };
  const flush = () => {
    trimTrailingSpace(line, style);
    if (line.glyphs.length) lines.push(line);
    line = { glyphs: [], width: 0 };
  };

  for (const word of words) {
    if (word.space && line.glyphs.length === 0) continue;
    if (line.width + word.width <= maxWidth + 1e-6) {
      append(line, word);
      continue;
    }
    if (word.space) {
      flush();
      continue;
    }
    flush();
    if (word.width <= maxWidth + 1e-6) {
      append(line, word);
      continue;
    }
    // A single word wider than the column. Break it by grapheme.
    for (const g of segments(source.slice(word.index, word.index + word.text.length), lang, 'grapheme')) {
      const part = withGlyphs({ index: word.index + g.index, segment: g.segment }, glyphs, style);
      if (line.width + part.width > maxWidth + 1e-6 && line.glyphs.length) flush();
      if (part.width > maxWidth + 1e-6) tooWide = true;
      append(line, part);
    }
  }
  flush();
  return { lines, missing, tooWide };
}

/**
 * Lay out text that may contain newlines. Each paragraph wraps on its own.
 */
export function layoutText(shaper, text, style, maxWidth, lang, features) {
  const lines = [];
  const missing = new Set();
  let tooWide = false;
  for (const para of String(text).split(/\r?\n/)) {
    if (para.trim() === '') continue;
    const r = layoutParagraph(shaper, para, style, maxWidth, lang, features);
    lines.push(...r.lines);
    for (const ch of r.missing) missing.add(ch);
    tooWide = tooWide || r.tooWide;
  }
  return { lines, missing, tooWide };
}

const OPENING = /^[([{"'\u2018\u201C\u00AB]+$/u;

/**
 * Punctuation is not a word, so the segmenter hands it back on its own and a
 * greedy fill could start a line with "." or end one with "(". Closing
 * punctuation joins the segment before it and opening punctuation the one
 * after, so a break never separates them.
 */
function glue(segs) {
  const out = [];
  let carry = null;
  for (const s of segs) {
    const space = /^\s+$/u.test(s.segment);
    const wordLike = /[\p{L}\p{N}]/u.test(s.segment);
    if (carry) {
      out.push({ index: carry.index, segment: carry.segment + s.segment });
      carry = null;
      continue;
    }
    if (!space && !wordLike) {
      if (OPENING.test(s.segment)) carry = s;
      else if (out.length && !/^\s+$/u.test(out[out.length - 1].segment)) out[out.length - 1] = { index: out[out.length - 1].index, segment: out[out.length - 1].segment + s.segment };
      else out.push(s);
      continue;
    }
    out.push(s);
  }
  if (carry) out.push(carry);
  return out;
}

function segments(text, lang, granularity) {
  const seg = new Intl.Segmenter(lang, { granularity });
  return Array.from(seg.segment(text), (s) => ({ index: s.index, segment: s.segment }));
}

function withGlyphs(seg, glyphs, style) {
  const start = seg.index;
  const end = start + seg.segment.length;
  const own = glyphs.filter((g) => g.cluster >= start && g.cluster < end);
  return {
    index: start,
    text: seg.segment,
    space: /^\s+$/u.test(seg.segment),
    glyphs: own,
    width: own.reduce((w, g) => w + glyphWidth(g, style), 0),
  };
}

function append(line, word) {
  line.glyphs.push(...word.glyphs);
  line.width += word.width;
}

function trimTrailingSpace(line, style) {
  while (line.glyphs.length) {
    const last = line.glyphs[line.glyphs.length - 1];
    if (!last.space) break;
    line.glyphs.pop();
    line.width -= glyphWidth(last, style);
  }
}

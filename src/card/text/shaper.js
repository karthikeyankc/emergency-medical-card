/**
 * Fonts and shaping through HarfBuzz.
 *
 * `createShaper` takes font files by script and weight and returns an
 * object the renderer uses to shape text into positioned glyphs and to
 * read glyph outlines. Positions and outlines come back in font units
 * (units per em). Conversion to millimetres happens in paragraph.js and
 * outline.js.
 */
import * as hb from 'harfbuzzjs';
import { itemise, registerScripts } from './itemise.js';

/**
 * @param {Record<string, string>} [scripts] font key → Unicode Script name, from the manifest
 * @param {Record<string, Record<number, ArrayBuffer|{data: ArrayBuffer, variations: Record<string, number>}>>} fontFiles
 *   e.g. { latin: { 400: { data, variations: { wght: 400 } }, 700: { data, variations: { wght: 700 } } }, tamil: { 400: buf, 700: buf } }
 */
export function createShaper(fontFiles, scripts) {
  if (scripts) registerScripts(scripts);
  const fonts = new Map();
  const faces = new Map();
  for (const [script, weights] of Object.entries(fontFiles)) {
    for (const [weight, file] of Object.entries(weights)) {
      // A weight is an ArrayBuffer, or { data, faceIndex, variations }. Several
      // weights may share one file, as a variable font or a collection.
      const data = file instanceof ArrayBuffer ? file : file.data;
      const faceIndex = file.faceIndex ?? 0;
      let blob = faces.get(data);
      if (!blob) {
        blob = { blob: new hb.Blob(data), faces: new Map() };
        faces.set(data, blob);
      }
      let face = blob.faces.get(faceIndex);
      if (!face) {
        face = new hb.Face(blob.blob, faceIndex);
        blob.faces.set(faceIndex, face);
      }
      const font = new hb.Font(face);
      const upem = face.upem;
      font.setScale(upem, upem);
      if (file.variations) font.setVariations(Object.entries(file.variations).map(([tag, value]) => new hb.Variation(tag, value)));
      fonts.set(`${script}:${weight}`, {
        script,
        weight: Number(weight),
        font,
        face,
        upem,
        outlines: new Map(),
      });
    }
  }

  // Greek and Cyrillic are set in the chosen Latin family, which covers them.
  const ALIAS = { greek: 'latin', cyrillic: 'latin' };

  function fontFor(script, weight) {
    const key = fonts.has(`${script}:${weight}`) || fonts.has(`${script}:400`) ? script : ALIAS[script] ?? script;
    return fonts.get(`${key}:${weight}`) ?? fonts.get(`${key}:400`) ?? null;
  }

  function shapeRun(text, start, end, entry, hbFeatures) {
    const buffer = new hb.Buffer();
    buffer.addText(text, start, end - start);
    buffer.guessSegmentProperties();
    hb.shape(entry.font, buffer, hbFeatures);
    const infos = buffer.getGlyphInfos();
    const positions = buffer.getGlyphPositions();
    const glyphs = infos.map((info, i) => ({
      gid: info.codepoint,
      cluster: info.cluster,
      ax: positions[i].xAdvance,
      ay: positions[i].yAdvance,
      dx: positions[i].xOffset,
      dy: positions[i].yOffset,
      font: entry,
    }));
    buffer.destroy?.();
    return glyphs;
  }

  /**
   * Characters the run's font lacks (a middle dot beside Tamil, say) are
   * tried in every other loaded font of the same weight before they count
   * as missing. Only whole clusters are swapped.
   */
  function fillGaps(text, glyphs, runEnd, entry, weight, hbFeatures) {
    if (!glyphs.some((g) => g.gid === 0)) return glyphs;
    const others = [...fonts.values()].filter((e) => e !== entry && e.weight === (fontFor(e.script, weight)?.weight ?? weight));
    const out = [];
    for (let i = 0; i < glyphs.length; i++) {
      if (glyphs[i].gid !== 0) {
        out.push(glyphs[i]);
        continue;
      }
      let j = i;
      while (j + 1 < glyphs.length && glyphs[j + 1].gid === 0) j++;
      const start = glyphs[i].cluster;
      const end = j + 1 < glyphs.length ? glyphs[j + 1].cluster : runEnd;
      let replaced = null;
      for (const other of others) {
        const attempt = shapeRun(text, start, end, other, hbFeatures);
        if (attempt.length && attempt.every((g) => g.gid !== 0)) {
          replaced = attempt;
          break;
        }
      }
      out.push(...(replaced ?? glyphs.slice(i, j + 1)));
      i = j;
    }
    return out;
  }

  /**
   * Shape a string. Returns glyphs in visual order with absolute UTF-16
   * cluster indices into `text`, plus the characters no font covers.
   *
   * @param {string} text
   * @param {number} weight 400 or 700
   * @param {string[]} [features] OpenType feature tags, e.g. ['tnum']
   */
  function shapeText(text, weight, features = []) {
    const glyphs = [];
    const missing = new Set();
    const hbFeatures = features.map((tag) => new hb.Feature(tag));
    for (const run of itemise(text)) {
      const entry = fontFor(run.script, weight);
      if (!entry) {
        for (const ch of text.slice(run.start, run.end)) if (!/\s/.test(ch)) missing.add(ch);
        continue;
      }
      const shaped = fillGaps(text, shapeRun(text, run.start, run.end, entry, hbFeatures), run.end, entry, weight, hbFeatures);
      for (const g of shaped) {
        if (g.gid === 0) {
          const ch = String.fromCodePoint(text.codePointAt(g.cluster));
          if (!/\s/.test(ch)) missing.add(ch);
        }
        glyphs.push(g);
      }
    }
    return { glyphs, missing };
  }

  /**
   * Cap height of a script's font at a weight, as a fraction of the em,
   * measured from the outline of H (or the first glyph of the sample).
   * Icons and chips centre on this, so every family lines up.
   */
  function capHeight(weight, script = 'latin', sample = 'H') {
    const entry = fontFor(script, weight);
    if (!entry) return 0.7;
    if (entry.capHeight == null) {
      const { glyphs } = shapeText(sample, weight);
      const g = glyphs.find((x) => x.font === entry && x.gid !== 0);
      let top = 0;
      if (g) for (const cmd of outline(entry, g.gid)) for (let i = 1; i < cmd.values.length; i += 2) top = Math.max(top, cmd.values[i]);
      entry.capHeight = top ? top / entry.upem : 0.7;
    }
    return entry.capHeight;
  }

  /** Glyph outline as path commands in font units, cached per font. */
  function outline(entry, gid) {
    let commands = entry.outlines.get(gid);
    if (!commands) {
      commands = entry.font.glyphToJson(gid);
      entry.outlines.set(gid, commands);
    }
    return commands;
  }

  return { fonts, fontFor, shapeText, outline, capHeight };
}

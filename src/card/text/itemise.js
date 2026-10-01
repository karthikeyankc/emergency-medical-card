/**
 * Split text into runs by Unicode script. Each run is shaped with the font
 * for its script. Common and inherited characters (spaces, digits,
 * punctuation, combining marks) join the neighbouring run.
 *
 * Scripts the project bundles fonts for are registered by the shaper from
 * the font manifest. Anything else comes back as `unknown`, and the
 * renderer reports its characters as missing glyphs.
 */

/** Script key → Unicode Script property. Latin is always present. */
let SCRIPTS = [['latin', /^\p{Script=Latin}$/u]];

/**
 * Tell the itemiser which scripts have fonts. `map` is key → Unicode
 * Script name, as in the font manifest's `scripts`.
 */
export function registerScripts(map) {
  SCRIPTS = Object.entries(map).map(([key, name]) => [key, new RegExp(`^\\p{Script=${name}}$`, 'u')]);
  if (!SCRIPTS.some(([k]) => k === 'latin')) SCRIPTS.push(['latin', /^\p{Script=Latin}$/u]);
}

const COMMON = /^[\p{Script=Common}\p{Script=Inherited}]$/u;

function scriptOf(ch) {
  for (const [name, re] of SCRIPTS) if (re.test(ch)) return name;
  if (COMMON.test(ch)) return null;
  return 'unknown';
}

/**
 * @param {string} text
 * @param {string} [fallback] script used when the whole text is common characters
 * @returns {{start: number, end: number, script: string}[]} UTF-16 offsets
 */
export function itemise(text, fallback = 'latin') {
  const chars = [];
  let index = 0;
  for (const ch of text) {
    chars.push({ index, length: ch.length, script: scriptOf(ch) });
    index += ch.length;
  }
  // Common characters take the script of the previous character, or the
  // next one at the start of the text.
  let previous = null;
  for (const c of chars) {
    if (c.script) previous = c.script;
    else if (previous) c.script = previous;
  }
  let next = null;
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i].script) next = chars[i].script;
    else chars[i].script = next ?? fallback;
  }
  const runs = [];
  for (const c of chars) {
    const last = runs[runs.length - 1];
    if (last && last.script === c.script) last.end = c.index + c.length;
    else runs.push({ start: c.index, end: c.index + c.length, script: c.script });
  }
  return runs;
}

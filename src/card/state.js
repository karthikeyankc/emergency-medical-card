/**
 * Card state. One plain object, saved to localStorage as JSON.
 *
 * Localised text is `{ en: string, ta?: string|null }`. A missing or null
 * entry for a language means "same as English". Script-neutral values
 * (years, phone numbers, blood group, dates) are plain strings.
 *
 * Multi-line fields (do, doNot, allergies) are one item per line.
 */

export const SCHEMA_VERSION = 3;

import languages from '../data/languages.json' with { type: 'json' };
import symbols from '../data/symbols.json' with { type: 'json' };
import fontManifest from '../fonts/manifest.json' with { type: 'json' };
import { palettes } from './tokens.js';
import { formats } from './formats/index.js';

export const LANGUAGES = languages.languages.map((l) => l.id);

export function localised(en = '') {
  return { en };
}

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    format: 'id1-landscape',
    mode: 'single',
    language: 'en',
    secondLanguage: 'ta',
    emblem: 'red-cross',
    /** Band and strip colours, a key of `palettes` in tokens.js. */
    theme: 'red',
    /** Latin family id from src/fonts/manifest.json, or 'custom'. Other scripts use their Noto font. */
    font: fontManifest.defaultLatin,
    /** Print the month and year in the bottom corner of the back. Off by default. */
    showDate: false,
    person: {
      name: localised(),
      birthYear: '',
      bloodGroup: '',
      address: localised(),
      showAddress: false,
    },
    conditions: [{ id: null, name: localised(), primary: true, icon: { kind: 'generic' } }],
    do: localised(),
    doNot: localised(),
    carries: localised(),
    medications: [],
    allergies: localised(),
    contacts: [{ name: localised(), relationship: localised(), phone: '' }],
    hospital: localised(),
    otherConditions: localised(),
    /** Numbers default from emergency-numbers.json for the country and can be edited. */
    emergency: { country: 'IN', general: '', ambulance: '' },
    /** QR code on the back. Off by default. `include` picks what rides along with the numbers. */
    qr: { on: false, size: 14, include: { condition: true, blood: false, hospital: false, address: false } },
    /** The catalogue prefill last applied to do and doNot, so edits can be detected. */
    prefill: null,
  };
}

/** Today's date as YYYY-MM-DD in local time. */
export function isoToday(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Pick a language's value from localised text, falling back to English.
 * @param {{en?: string, [lang: string]: string|null|undefined}|undefined} text
 * @param {string} lang
 */
export function pick(text, lang) {
  if (!text) return '';
  const v = text[lang];
  return v == null || v === '' ? text.en ?? '' : v;
}

/** Split a multi-line field into trimmed, non-empty items. */
export function lines(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The language a side renders in, given the layout's declaration. */
export function resolveLanguage(declared, state) {
  if (declared === 'primary') return state.language;
  if (declared === 'second') return state.secondLanguage;
  return declared;
}

/**
 * Migrations from each older version to the next. Keys are the version
 * being migrated from. Add one entry per schema change.
 */
const migrations = {
  // v1 stored the QR toggle as a boolean.
  1: (s) => ({ ...s, version: 2, qr: { on: Boolean(s.qr), size: 14, include: { condition: true, blood: false, hospital: false, address: false } } }),
  // v3 added the optional date, off for existing cards.
  2: (s) => ({ ...s, version: 3, showDate: false }),
};

/**
 * Bring stored state up to the current schema. Throws on anything that is
 * not a plain object or is newer than this build understands.
 */
export function migrate(stored) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    throw new Error('Stored card is not an object');
  }
  let state = stored;
  let v = Number(state.version) || 1;
  if (v > SCHEMA_VERSION) throw new Error(`Card was saved by a newer version (${v})`);
  while (v < SCHEMA_VERSION) {
    const step = migrations[v];
    if (!step) throw new Error(`No migration from version ${v}`);
    state = step(state);
    v = state.version;
  }
  const { issueDate, ...rest } = state;
  return clean(fill(defaultState(), rest));
}

const ENUMS = {
  format: Object.keys(formats).filter((id) => id !== 'phone-lockscreen'),
  mode: ['single', 'bilingual'],
  language: LANGUAGES,
  secondLanguage: LANGUAGES,
  emblem: ['red-cross', 'rod-of-asclepius', 'none'],
  theme: Object.keys(palettes),
  font: [...Object.keys(fontManifest.latin), 'custom'],
};
const QR_SIZES = [14, 16, 18];
const ICON_TAGS = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);
const ICON_ATTRS = new Set(['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2', 'points', 'fill']);
const DATA_URL = /^data:image\/(png|svg\+xml);base64,[A-Za-z0-9+/]+=*$/;

/**
 * A backup file or stored card can hold anything. Values that pick from a
 * list fall back to the default, and a condition icon is rebuilt from
 * bundled data or dropped, since icon markup goes into the page and the SVG.
 */
function clean(state) {
  const defaults = defaultState();
  for (const [key, allowed] of Object.entries(ENUMS)) if (!allowed.includes(state[key])) state[key] = defaults[key];
  if (!QR_SIZES.includes(Number(state.qr.size))) state.qr.size = defaults.qr.size;
  for (const key of ['conditions', 'medications', 'contacts']) {
    if (!state[key].every((item) => item && typeof item === 'object' && !Array.isArray(item))) state[key] = defaults[key];
  }
  for (const condition of state.conditions) condition.icon = cleanIcon(condition.icon);
  return state;
}

/** @returns {object} the icon rebuilt from trusted data, or the generic icon */
export function cleanIcon(icon) {
  if (icon?.kind === 'symbol') {
    const sym = symbols.find((s) => s.id === icon.id);
    return sym ? symbolIcon(sym) : { kind: 'generic' };
  }
  if (icon?.kind === 'lucide' && Array.isArray(icon.node)) {
    const safe = icon.node.every(
      (el) => Array.isArray(el) && ICON_TAGS.has(el[0]) && el[1] && typeof el[1] === 'object' &&
        Object.entries(el[1]).every(([a, v]) => ICON_ATTRS.has(a) && /^[\d\s.,+\-a-zA-Z]*$/.test(String(v))),
    );
    const box = Array.isArray(icon.box) && icon.box.length === 4 && icon.box.every(Number.isFinite) ? icon.box : undefined;
    return safe ? { kind: 'lucide', name: String(icon.name ?? ''), node: icon.node, box } : { kind: 'generic' };
  }
  if (icon?.kind === 'upload' && DATA_URL.test(String(icon.dataUrl))) {
    return { kind: 'upload', mime: icon.dataUrl.startsWith('data:image/png') ? 'image/png' : 'image/svg+xml', dataUrl: icon.dataUrl };
  }
  return { kind: 'generic' };
}

/** A Commons symbol as a condition icon. */
export function symbolIcon(sym) {
  return { kind: 'symbol', id: sym.id, name: sym.name, viewBox: sym.viewBox, markup: sym.markup, credit: `${sym.author}, ${sym.licence}, Wikimedia Commons` };
}

/** Deep-fill missing keys from defaults without touching arrays the user owns. */
function fill(defaults, value) {
  if (Array.isArray(defaults)) return Array.isArray(value) ? value : defaults;
  if (defaults && typeof defaults === 'object') {
    const out = { ...defaults };
    if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        out[key] = key in defaults ? fill(defaults[key], value[key]) : value[key];
      }
    }
    return out;
  }
  return value === undefined ? defaults : value;
}

/** The same card as a phone lock screen: one side, the first language, the phone layout. */
export function phoneState(state) {
  return { ...state, format: 'phone-lockscreen', mode: 'phone' };
}

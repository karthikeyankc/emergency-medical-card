/**
 * QR code for the emergency numbers, as SVG paths. Optional, off by
 * default. Encodes a MECARD with the name and phone numbers, which phones
 * read natively and offer to call or save.
 *
 * Uses qrcode-generator (MIT). Error correction M: higher levels add
 * modules and shrink them, which hurts more than it helps at 15 mm.
 */
import qrcode from 'qrcode-generator';

// The library keeps only the low byte of each character by default, which
// breaks any name outside Latin-1. Encode as UTF-8, which phones expect.
qrcode.stringToBytes = (s) => Array.from(new TextEncoder().encode(s));

const f = (n) => Math.round(n * 1000) / 1000;

/** Digits and a leading plus only, so the phone dials it as written. */
export function normalisePhone(raw) {
  const s = String(raw ?? '').trim();
  const plus = s.startsWith('+') ? '+' : '';
  return plus + s.replace(/\D/g, '');
}

const clean = (s) => String(s ?? '').replace(/[;:,\\]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * MECARD text. The contact is named after the card's owner with a label,
 * since the numbers belong to other people. `note` and `address` are
 * optional and phones import them as the contact's note and address.
 * Null when there is no number.
 */
export function mecard(name, phones, { label = 'emergency contacts', note, address, max = 3 } = {}) {
  const tels = phones.map(normalisePhone).filter((p) => p.replace('+', '').length >= 6).slice(0, max);
  if (!tels.length) return null;
  const n = clean(name);
  const parts = [`N:${n ? `${n} (${label})` : label};`, ...tels.map((t) => `TEL:${t};`)];
  if (note) parts.push(`NOTE:${clean(note)};`);
  if (address) parts.push(`ADR:${clean(address)};`);
  return `MECARD:${parts.join('')};`;
}

/**
 * The payload for a card. Numbers always. The rest follows `state.qr.include`.
 * Null when there is no number to encode.
 */
export function mecardFor(state, strings = {}) {
  const inc = state.qr?.include ?? {};
  const primary = state.conditions.find((c) => c.primary) ?? state.conditions[0];
  const en = (t) => (t && (t.en ?? '')) || '';
  const notes = [];
  if (inc.condition && en(primary?.name)) notes.push(en(primary.name));
  if (inc.blood && state.person.bloodGroup) notes.push(`${strings.bloodGroup ?? 'Blood group'} ${state.person.bloodGroup}`);
  if (inc.hospital && en(state.hospital)) notes.push(`${strings.hospital ?? 'Hospital'}: ${en(state.hospital)}`);
  return mecard(en(state.person.name), state.contacts.map((c) => c.phone), {
    note: notes.length ? notes.join('. ') : null,
    address: inc.address ? en(state.person.address) : null,
  });
}

/** Minimum module size a phone camera reads from a hand's length, and the size it reads with ease. */
export const MODULE_MIN = 0.33;
export const MODULE_EASY = 0.4;

/**
 * How a payload fares at a given printed size.
 * @returns {{ bytes: number, modules: number, moduleMm: number, verdict: 'easy'|'close'|'dense' }}
 */
export function capacity(text, sizeMm) {
  const bytes = new TextEncoder().encode(text).length;
  const modules = moduleCount(text);
  const moduleMm = sizeMm / modules;
  const verdict = moduleMm >= MODULE_EASY ? 'easy' : moduleMm >= MODULE_MIN ? 'close' : 'dense';
  return { bytes, modules, moduleMm, verdict };
}

function moduleCount(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.getModuleCount();
}

/**
 * @returns {{ markup: string, modules: number, moduleMm: number }}
 */
export function qrMarkup(text, x, y, size, colour) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const modules = qr.getModuleCount();
  const m = size / modules;
  const d = [];
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) if (qr.isDark(r, c)) d.push(`M${c} ${r}h1v1h-1z`);
  }
  const markup = `<g transform="translate(${f(x)} ${f(y)}) scale(${f(m)})"><path d="${d.join('')}" fill="${colour}"/></g>`;
  return { markup, modules, moduleMm: m };
}

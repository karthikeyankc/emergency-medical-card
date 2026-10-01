import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadNodeShaper, loadStrings, loadNumbers } from './helpers/node-context.mjs';
import { renderCard } from '../src/card/render.js';
import { defaultState, phoneState } from '../src/card/state.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let ctx;
beforeAll(() => {
  ctx = { shaper: loadNodeShaper(root, 'inter', ['tamil', 'devanagari']), strings: loadStrings(root), numbers: loadNumbers(root) };
});

const fixture = () => JSON.parse(readFileSync(join(root, 'tests/fixtures/single-en.json'), 'utf8'));

describe('renderCard', () => {
  it('renders the fixture with no overflow and no missing glyphs', () => {
    const r = renderCard(fixture(), ctx);
    expect(r.ok).toBe(true);
    expect(r.overflow).toEqual([]);
    expect(r.missing).toEqual({});
  });
  it('emits self-contained SVG in millimetres with all text as paths', () => {
    const r = renderCard(fixture(), ctx);
    for (const side of ['front', 'back']) {
      const svg = r.sides[side].svg;
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="85.6mm" height="53.98mm" viewBox="0 0 85.6 53.98">')).toBe(true);
      expect(svg).not.toContain('<text');
      expect(svg).not.toContain('@font-face');
      expect(svg).not.toContain('<style');
      expect(svg.slice(svg.indexOf('>'))).not.toContain('http');
      expect(svg).toContain('<path d="M');
    }
  });
  it('renders an empty card, and lists what it needs before it can be downloaded', () => {
    const r = renderCard(defaultState(), ctx);
    expect(r.sides.front.svg).toContain('</svg>');
    expect(r.overflow).toEqual([]);
    expect(r.incomplete).toEqual(['name', 'birthYear', 'condition', 'do', 'doNot', 'contactPhone']);
    expect(r.ok).toBe(false);
  });
  it('needs a phone number a phone can dial and a real year of birth', () => {
    const s = fixture();
    expect(renderCard({ ...s, contacts: [{ name: { en: 'Ravi' }, relationship: { en: '' }, phone: 'asdasdas' }] }, ctx).incomplete).toEqual(['contactPhone']);
    expect(renderCard({ ...s, person: { ...s.person, birthYear: '1230' } }, ctx).incomplete).toEqual(['birthYear']);
    expect(renderCard(s, ctx).incomplete).toEqual([]);
  });
  it('fills empty sections with None and empty allergies with None known', () => {
    const s = fixture();
    s.medications = [];
    s.allergies = { en: '' };
    const back = renderCard(s, ctx).sides.back.svg;
    const blank = { ...fixture(), medications: [{ name: { en: 'Placeholder' }, dose: '', frequency: { en: '' } }], allergies: { en: 'Placeholder' } };
    expect(back).not.toBe(renderCard(blank, ctx).sides.back.svg);
    expect(renderCard(s, ctx).ok).toBe(true);
  });
  it('prints the optional date in the corner of the back without taking a row', () => {
    const s = fixture();
    const without = renderCard(s, { ...ctx, today: '2026-09-25' });
    const withDate = renderCard({ ...s, showDate: true }, { ...ctx, today: '2026-09-25' });
    expect(withDate.sides.back.svg.length).toBeGreaterThan(without.sides.back.svg.length);
    expect(withDate.sides.front.svg).toBe(without.sides.front.svg);
    expect(withDate.sides.back.fill).toBeCloseTo(without.sides.back.fill);
    expect(withDate.overflow).toEqual([]);
    const bilingual = renderCard({ ...s, mode: 'bilingual', showDate: true }, { ...ctx, today: '2026-09-25' });
    expect(bilingual.sides.back.svg.length).toBeGreaterThan(renderCard({ ...s, mode: 'bilingual' }, ctx).sides.back.svg.length);
  });
  it('renders the bilingual layout with Tamil on the back', () => {
    const s = fixture();
    s.mode = 'bilingual';
    s.person.name.ta = 'சாரா குமார்';
    s.conditions[0].name.ta = 'வகை 1 நீரிழிவு';
    const r = renderCard(s, ctx);
    expect(r.sides.back.lang).toBe('ta');
    expect(r.missing).toEqual({});
    expect(r.sides.back.svg).toContain('<path');
  });
  it('draws an opt-in QR code of the numbers on the back without overflow', () => {
    const s = fixture();
    s.qr = { on: true, size: 14, include: { condition: true, blood: false, hospital: false, address: false } };
    const r = renderCard(s, ctx);
    expect(r.ok).toBe(true);
    expect(r.sides.back.svg).toContain('h1v1h-1z');
    expect(r.sides.front.svg).not.toContain('h1v1h-1z');
    expect(renderCard(fixture(), ctx).sides.back.svg).not.toContain('h1v1h-1z');
  });
  it('draws an icon the user picked from Lucide on the strip', () => {
    const s = fixture();
    s.conditions[0].icon = { kind: 'lucide', name: 'heart-pulse', node: [['path', { d: 'M3 12h4l3-9 4 18 3-9h4' }]], box: [3, 3, 21, 21] };
    const svg = renderCard(s, ctx).sides.front.svg;
    expect(svg).toContain('M3 12h4l3-9 4 18 3-9h4');
  });
  it('prints a typed emergency number over the table entry', () => {
    const s = fixture();
    s.emergency = { country: 'XX', general: '555', ambulance: '' };
    const r = renderCard(s, ctx);
    expect(r.ok).toBe(true);
    const missing = renderCard({ ...fixture(), emergency: { country: 'XX', general: '', ambulance: '' } }, ctx);
    expect(missing.incomplete).toEqual(['emergency']);
  });
  it('applies a colour theme to the band and strip only', () => {
    const s = fixture();
    s.theme = 'blue';
    const svg = renderCard(s, ctx).sides.front.svg;
    expect(svg).toContain('fill="#1E3A8A"');
    expect(svg).toContain('fill="#CFE3FF"');
    expect(svg).toContain('fill="#0B4E24"');
    expect(svg).toContain('fill="#7F1710"'); // DO NOT keeps its red under a blue theme
  });
  it('draws a Commons symbol the user picked, keeping its colours', () => {
    const s = fixture();
    s.conditions[0].icon = { kind: 'symbol', id: 'blue-circle', viewBox: '0 0 100 100', markup: '<circle cx="50" cy="50" r="40" fill="#0072BC"/>' };
    expect(renderCard(s, ctx).sides.front.svg).toContain('fill="#0072BC"');
  });
  it('renders the ID-2 pocket format at 105 × 74 mm', () => {
    const s = fixture();
    s.format = 'id2-landscape';
    const r = renderCard(s, ctx);
    expect(r.ok).toBe(true);
    expect(r.sides.front.svg).toContain('width="105mm" height="74mm" viewBox="0 0 85.6 60.328"');
    // Same grid, larger type, and still more room than the wallet card.
    expect(r.sides.back.fill).toBeLessThan(renderCard(fixture(), ctx).sides.back.fill);
  });
  it('renders the phone lock screen as one framed side at 1080 × 2400 px', () => {
    const s = phoneState(fixture());
    const r = renderCard(s, ctx);
    expect(r.ok).toBe(true);
    expect(r.format.sides).toEqual(['screen']);
    const svg = r.sides.screen.svg;
    expect(svg).toMatch(/^<svg [^>]*width="1080px" height="2400px" viewBox="0 0 78 173\.\d+"/);
    expect(svg).toContain('fill="#1C2024"'); // the ground
    expect(svg).toMatch(/<g transform="translate\(3 38\.\d+\)">/); // the panel sits below the clock
    expect(svg).toContain('clip-path='); // rounded panel corners survive export
    expect(svg).not.toContain('<text');
  });
  it('renders a Hindi card with English headings as the fallback', () => {
    const s = fixture();
    s.mode = 'bilingual';
    s.secondLanguage = 'hi';
    s.person.name.hi = 'सारा कुमार';
    s.do.hi = 'मुझे चीनी या जूस दें।';
    const r = renderCard(s, ctx);
    expect(r.sides.back.lang).toBe('hi');
    expect(r.missing).toEqual({});
  });
  it('reports overflow by field and blocks ok', () => {
    const s = fixture();
    s.do.en = Array(12).fill('A long instruction that will not fit on the card at all.').join('\n');
    const r = renderCard(s, ctx);
    expect(r.ok).toBe(false);
    expect(r.overflow).toContain('do');
  });
  it('reports missing glyphs by field', () => {
    const s = fixture();
    s.person.name.en = 'Sara שלום';
    const r = renderCard(s, ctx);
    expect(r.ok).toBe(false);
    expect(r.missing.name).toContain('ש');
  });
  it('preview and export differ only in mask and hatching', () => {
    const preview = renderCard(fixture(), { ...ctx, preview: true }).sides.front.svg;
    const exported = renderCard(fixture(), { ...ctx, preview: false }).sides.front.svg;
    expect(preview).toContain('clip-path="url(#card-front)"');
    expect(preview).toContain('fill="#F7C600"');
    const back = renderCard(fixture(), { ...ctx, preview: true }).sides.back.svg;
    expect(back).toContain('id="body-back"');
    expect(back).not.toContain('id="body-front"');
    expect(exported).not.toContain('clip-path');
    expect(exported).not.toContain('<defs>');
  });
});

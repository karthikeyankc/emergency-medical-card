import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadNodeShaper, latinFamilies } from './helpers/node-context.mjs';
import { itemise } from '../src/card/text/itemise.js';
import { layoutText, layoutParagraph } from '../src/card/text/paragraph.js';
import { type } from '../src/card/tokens.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let shaper;
beforeAll(() => {
  shaper = loadNodeShaper(root);
});

describe('itemise', () => {
  it('attaches common characters to the neighbouring run', () => {
    const runs = itemise('Type 1 Diabetes, டைப் 1.');
    expect(runs.map((r) => r.script)).toEqual(['latin', 'tamil']);
    expect(runs[0].start).toBe(0);
    expect(runs[1].end).toBe('Type 1 Diabetes, டைப் 1.'.length);
  });
  it('reports scripts with no bundled font as unknown', () => {
    expect(itemise('שלום')[0].script).toBe('unknown');
  });
  it('falls back for digits alone', () => {
    expect(itemise('112')[0].script).toBe('latin');
  });
});

describe('shaping', () => {
  it('covers English and Tamil with no missing glyphs', () => {
    for (const text of ['Emergency medical information', 'அவசர மருத்துவத் தகவல்', 'Ravi +44 7700 900123']) {
      const { glyphs, missing } = shaper.shapeText(text, 400);
      expect(missing.size).toBe(0);
      expect(glyphs.length).toBeGreaterThan(0);
      expect(glyphs.every((g) => g.gid !== 0)).toBe(true);
    }
  });
  it('reorders a Tamil pre-base vowel sign', () => {
    // In கெ the vowel sign ெ (U+0BC6) is written before க but stored after it.
    const { glyphs } = shaper.shapeText('கெ', 400);
    const alone = shaper.shapeText('க', 400).glyphs[0].gid;
    expect(glyphs.length).toBe(2);
    expect(glyphs[0].gid).not.toBe(alone);
    expect(glyphs[1].gid).toBe(alone);
  });
  it('names characters no font covers', () => {
    const { missing } = shaper.shapeText('Take שלום daily', 400);
    expect([...missing].join('')).toContain('ש');
  });
});

describe('line breaking', () => {
  it('wraps within the width and never returns an empty line', () => {
    const text = 'If I am confused, sweaty, or shaky, give me sugar: juice, glucose tablets, or sweets.';
    const { lines } = layoutParagraph(shaper, text, type.body, 38, 'en');
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(line.width).toBeLessThanOrEqual(38 + 1e-6);
      expect(line.glyphs.length).toBeGreaterThan(0);
    }
  });
  it('breaks an overlong word by grapheme instead of overflowing', () => {
    const { lines, tooWide } = layoutParagraph(shaper, 'Supercalifragilisticexpialidocious', type.body, 12, 'en');
    expect(lines.length).toBeGreaterThan(1);
    expect(tooWide).toBe(false);
  });
  it('never orphans punctuation at a line edge', () => {
    const text = 'Feed if I am in fits (chokes). Feed glucose, juice, sugar.';
    for (const width of [20, 24, 28, 32, 36]) {
      const { lines } = layoutParagraph(shaper, text, type.body, width, 'en');
      for (const line of lines) {
        const first = text.slice(line.glyphs[0].cluster, line.glyphs[0].cluster + 1);
        const last = text.slice(line.glyphs[line.glyphs.length - 1].cluster, line.glyphs[line.glyphs.length - 1].cluster + 1);
        expect(first).not.toMatch(/[.,)]/);
        expect(last).not.toBe('(');
      }
    }
  });
  it('honours explicit newlines', () => {
    const { lines } = layoutText(shaper, 'One\nTwo\nThree', type.body, 80, 'en');
    expect(lines.length).toBe(3);
  });
  it('wraps Tamil at word boundaries', () => {
    const { lines, missing } = layoutParagraph(shaper, 'எனக்கு குழப்பம் இருந்தால் சர்க்கரை அல்லது பழச்சாறு கொடுங்கள்', type.body, 38, 'ta');
    expect(missing.size).toBe(0);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(line.width).toBeLessThanOrEqual(38 + 1e-6);
  });
});

describe('every Latin family', () => {
  const sample = 'Type 1 Diabetes · B− · +44 7700 900123 · CONDITION – 500 mg (chokes).';
  for (const [id, fam] of Object.entries(latinFamilies(root))) {
    it(`${fam.family} covers the card characters and measures a cap height`, () => {
      const s = loadNodeShaper(root, id);
      for (const weight of [400, 700]) {
        const { missing, glyphs } = s.shapeText(sample, weight);
        expect([...missing]).toEqual([]);
        expect(glyphs.length).toBeGreaterThan(0);
      }
      const cap = s.capHeight(700);
      expect(cap).toBeGreaterThan(0.6);
      expect(cap).toBeLessThan(0.8);
    });
  }
});

describe('Noto Sans fallback', () => {
  const languages = JSON.parse(require('node:fs').readFileSync(join(root, 'src', 'data', 'languages.json'), 'utf8')).languages;
  const dir = join(root, 'src', 'data', 'i18n', 'card');
  const headings = languages
    .filter((l) => ['latin', 'greek', 'cyrillic'].includes(l.script) && !l.unsupported)
    .flatMap((l) => Object.entries(JSON.parse(require('node:fs').readFileSync(join(dir, `${l.id}.json`), 'utf8')))
      .filter(([k, v]) => !k.startsWith('_') && typeof v === 'string')
      .map(([, v]) => v.toLocaleUpperCase(l.id)));
  const names = 'Nguyễn Thị Hằng · Ștefan Țepeș · İsmail Işık · Łukasz Żółć · Ελένη Γιώργος · Ђорђе Љиљана · Ґ Ї Ё';
  it('Atkinson Hyperlegible Next lacks Greek and Cyrillic on its own', () => {
    expect([...loadNodeShaper(root, 'atkinson', []).shapeText('Ελένη Дайте', 400).missing].length).toBeGreaterThan(0);
  });
  for (const [id, fam] of Object.entries(latinFamilies(root))) {
    it(`${fam.family} with the fallback covers every Latin, Greek, and Cyrillic heading and name`, () => {
      const s = loadNodeShaper(root, id, [], true);
      for (const weight of [400, 700]) {
        for (const text of [...headings, names]) expect([...s.shapeText(text, weight).missing], text).toEqual([]);
      }
    });
  }
});

describe('other scripts', () => {
  const samples = {
    devanagari: ['hi', 'मुझे चीनी या जूस दें। यदि मैं निगल न सकूँ तो एम्बुलेंस बुलाएँ।'],
    bengali: ['bn', 'আমাকে চিনি বা জুস দিন। গিলতে না পারলে অ্যাম্বুলেন্স ডাকুন।'],
    malayalam: ['ml', 'എനിക്ക് പഞ്ചസാരയോ ജ്യൂസോ തരൂ. വിഴുങ്ങാൻ കഴിയുന്നില്ലെങ്കിൽ ആംബുലൻസ് വിളിക്കൂ.'],
    thai: ['th', 'ให้น้ำตาลหรือน้ำผลไม้แก่ฉัน หากฉันกลืนไม่ได้ให้เรียกรถพยาบาล'],
  };
  for (const [script, [lang, sample]] of Object.entries(samples)) {
    it(`${script} shapes with no missing glyphs and wraps within the column`, () => {
      const s = loadNodeShaper(root, 'inter', [script]);
      const { lines, missing } = layoutParagraph(s, sample, type.body, 38, lang);
      expect([...missing]).toEqual([]);
      expect(lines.length).toBeGreaterThan(1);
      for (const line of lines) expect(line.width).toBeLessThanOrEqual(38 + 1e-6);
    });
  }
  it('sets Greek and Cyrillic in the Latin family', () => {
    const s = loadNodeShaper(root, 'inter', []);
    for (const text of ['Δώστε μου ζάχαρη ή χυμό.', 'Дайте мне сахар или сок.']) expect([...s.shapeText(text, 400).missing]).toEqual([]);
  });
});

describe('card headings in every language', () => {
  const { readdirSync, readFileSync } = require('node:fs');
  const dir = join(root, 'src', 'data', 'i18n', 'card');
  const en = JSON.parse(readFileSync(join(dir, 'en.json'), 'utf8'));
  const keys = Object.keys(en).filter((k) => !k.startsWith('_'));
  const languages = JSON.parse(readFileSync(join(root, 'src', 'data', 'languages.json'), 'utf8')).languages;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const id = file.replace('.json', '');
    it(`${id} has every heading and every glyph`, () => {
      const strings = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      for (const k of keys) expect(strings[k], `${id}.${k}`).toBeTruthy();
      const lang = languages.find((l) => l.id === id);
      expect(lang, `${id} listed in languages.json`).toBeTruthy();
      const s = loadNodeShaper(root, 'inter', [lang.script]);
      for (const k of keys) {
        for (const weight of [400, 700]) {
          const { missing } = s.shapeText(strings[k].toLocaleUpperCase(id), weight);
          expect([...missing], `${id}.${k}`).toEqual([]);
        }
      }
    });
  }
});

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { inspectFontFile, pickFaces, customFontFiles } from '../src/card/text/fontfile.js';
import { createShaper } from '../src/card/text/shaper.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const buf = (p) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const tamilData = buf(join(root, 'src/fonts/noto/NotoSansTamil-Variable.ttf'));
const tamil = { 400: { data: tamilData, variations: { wght: 400 } }, 700: { data: tamilData, variations: { wght: 700 } } };

describe('a font from the user\'s computer', () => {
  it('reads a variable font as one face serving both weights', () => {
    const { faces } = inspectFontFile(buf(join(root, 'src/fonts/inter/Inter-Variable.ttf')));
    expect(faces).toHaveLength(1);
    expect(faces[0].family).toBe('Inter');
    expect(faces[0].variable).toBe(true);
    const picked = pickFaces(faces);
    expect(picked.viaAxis).toBe(true);
    expect(picked.boldSynthetic).toBe(false);
  });
  it('rejects a file that is not a font', () => {
    expect(() => inspectFontFile(new TextEncoder().encode('hello').buffer)).toThrow();
  });
  const helvetica = '/System/Library/Fonts/Helvetica.ttc';
  it.skipIf(!existsSync(helvetica))('picks Regular and Bold out of the macOS Helvetica collection and shapes with them', () => {
    const data = buf(helvetica);
    const { faces } = inspectFontFile(data);
    expect(faces.length).toBeGreaterThanOrEqual(2);
    const picked = pickFaces(faces);
    expect(picked.regular.style).toBe('Regular');
    expect(picked.bold.style).toBe('Bold');
    const record = {
      name: 'Helvetica',
      regular: { data, faceIndex: picked.regular.index, variable: false },
      bold: { data, faceIndex: picked.bold.index, variable: false },
    };
    const shaper = createShaper({ latin: customFontFiles(record), tamil });
    for (const w of [400, 700]) {
      const { missing, glyphs } = shaper.shapeText('Type 1 Diabetes · +44 7700 900123 – B−', w);
      expect([...missing]).toEqual([]);
      expect(glyphs.length).toBeGreaterThan(0);
    }
    // Bold really is a different face: wider advances for the same word.
    const width = (w) => shaper.shapeText('Emergency', w).glyphs.reduce((a, g) => a + g.ax, 0);
    expect(width(700)).toBeGreaterThan(width(400));
    expect(shaper.capHeight(400)).toBeGreaterThan(0.6);
  });
});

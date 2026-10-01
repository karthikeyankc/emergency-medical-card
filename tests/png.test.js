import { describe, it, expect } from 'vitest';
import { Resvg } from '@resvg/resvg-js';
import { withPhys, readPhys, pixelSize, pixelsPerMetre } from '../src/export/png.js';

const tiny = new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="#fff"/></svg>').render().asPng();

describe('pHYs', () => {
  it('writes the density in pixels per metre', () => {
    const out = withPhys(new Uint8Array(tiny), 600);
    expect(readPhys(out)).toEqual({ x: 23622, y: 23622, unit: 1 });
    expect(pixelsPerMetre(300)).toBe(11811);
  });
  it('keeps a valid PNG that resvg-free decoders accept', () => {
    const out = withPhys(new Uint8Array(tiny), 300);
    // Signature intact and IHDR still first.
    expect([...out.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(String.fromCharCode(...out.subarray(12, 16))).toBe('IHDR');
    expect(String.fromCharCode(...out.subarray(37, 41))).toBe('pHYs');
    // Replacing an existing pHYs does not duplicate it.
    const again = withPhys(out, 600);
    expect(again.length).toBe(out.length);
    expect(readPhys(again).x).toBe(23622);
  });
  it('sizes the ID-1 card correctly', () => {
    expect(pixelSize(85.6, 53.98, 300)).toEqual({ width: 1011, height: 638 });
    expect(pixelSize(85.6, 53.98, 600)).toEqual({ width: 2022, height: 1275 });
  });
});

import { fileName } from '../src/export/download.js';
describe('file names', () => {
  it('names every file after the person', () => {
    expect(fileName('pdf', null, '2026-09-14')).toBe('medical-card-2026-09-14.pdf');
    expect(fileName('png', 'front', '2026-09-14', 'Sara Kumar')).toBe('medical-card-sara-kumar-front-2026-09-14.png');
    expect(fileName('json', null, '2026-09-14', 'Gita Kumar.')).toBe('medical-card-gita-kumar-2026-09-14.json');
    expect(fileName('json', null, '2026-09-14', 'சாரா குமார்')).toBe('medical-card-சாரா-குமார்-2026-09-14.json');
    expect(fileName('json', null, '2026-09-14', '')).toBe('medical-card-2026-09-14.json');
  });
});


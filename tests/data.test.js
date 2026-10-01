import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => JSON.parse(readFileSync(join(root, ...p), 'utf8'));

describe('emergency numbers', () => {
  const numbers = read('src', 'data', 'emergency-numbers.json');
  const entries = Object.entries(numbers).filter(([k]) => !k.startsWith('_'));
  it('keys every entry by an ISO 3166-1 alpha-2 code', () => {
    for (const [code] of entries) expect(code).toMatch(/^[A-Z]{2}$/);
  });
  it('holds digits only, as the card prints them', () => {
    for (const [code, e] of entries) {
      expect(e.general, code).toMatch(/^\d{2,6}$/);
      if (e.ambulance !== null) expect(e.ambulance, code).toMatch(/^\d{2,6}$/);
      expect(e.ambulance, code).not.toBe(e.general);
    }
  });
  it('cites a public source and the date it was checked', () => {
    for (const [code, e] of entries) {
      expect(e.source, code).toMatch(/^https:\/\//);
      expect(e.lastVerified, code).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('paper sizes', () => {
  it('lists Letter countries by ISO code', () => {
    for (const code of read('src', 'data', 'paper.json').letter) expect(code).toMatch(/^[A-Z]{2}$/);
  });
});

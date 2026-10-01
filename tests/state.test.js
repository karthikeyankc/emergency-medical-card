import { describe, it, expect } from 'vitest';
import { migrate, defaultState, pick, lines, SCHEMA_VERSION } from '../src/card/state.js';

describe('state', () => {
  it('fills missing keys from defaults on load', () => {
    const s = migrate({ version: SCHEMA_VERSION, person: { name: { en: 'Sara' } } });
    expect(s.person.name.en).toBe('Sara');
    expect(s.person.birthYear).toBe('');
    expect(s.mode).toBe('single');
    expect(Array.isArray(s.contacts)).toBe(true);
  });
  it('rejects state from a newer version', () => {
    expect(() => migrate({ version: SCHEMA_VERSION + 1 })).toThrow(/newer/);
  });
  it('rejects non-objects', () => {
    expect(() => migrate('nope')).toThrow();
    expect(() => migrate([])).toThrow();
  });
  it('round-trips through JSON', () => {
    const s = defaultState();
    expect(migrate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it('migrates the v1 boolean QR toggle to the v2 object', () => {
    const s = migrate({ version: 1, qr: true });
    expect(s.version).toBe(SCHEMA_VERSION);
    expect(s.qr.on).toBe(true);
    expect(s.qr.size).toBe(14);
    expect(s.qr.include.condition).toBe(true);
  });
  it('drops the retired issueDate field on load', () => {
    expect('issueDate' in migrate({ version: 1, issueDate: '2026-09-14' })).toBe(false);
  });
  it('falls back to English for a missing translation', () => {
    expect(pick({ en: 'Sara', ta: null }, 'ta')).toBe('Sara');
    expect(pick({ en: 'Sara', ta: 'சாரா' }, 'ta')).toBe('சாரா');
    expect(pick(undefined, 'ta')).toBe('');
  });
  it('splits multi-line fields into items', () => {
    expect(lines(' a \n\nb\r\n')).toEqual(['a', 'b']);
  });
});

describe('import validation', () => {
  it('rebuilds a symbol icon from bundled data and ignores markup in the file', () => {
    const s = migrate({ version: 2, conditions: [{ name: { en: 'Epilepsy' }, primary: true, icon: { kind: 'symbol', id: 'purple-ribbon', markup: '<script>alert(1)</script>' } }] });
    expect(s.conditions[0].icon.kind).toBe('symbol');
    expect(s.conditions[0].icon.markup).not.toContain('<script');
  });
  it('drops an unknown symbol, unsafe icon markup, and a data URL that could break out of an attribute', () => {
    const icons = [
      { kind: 'symbol', id: 'nope', markup: '<circle r="1"/>' },
      { kind: 'lucide', name: 'x', node: [['script', { src: 'x' }]] },
      { kind: 'lucide', name: 'x', node: [['path', { d: 'M0 0', onload: 'alert(1)' }]] },
      { kind: 'upload', dataUrl: 'data:image/png;base64,AAAA" onerror="alert(1)' },
    ];
    for (const icon of icons) expect(migrate({ version: 2, conditions: [{ name: { en: '' }, primary: true, icon }] }).conditions[0].icon).toEqual({ kind: 'generic' });
  });
  it('keeps a valid Lucide icon and a valid upload', () => {
    const lucide = { kind: 'lucide', name: 'brain', node: [['path', { d: 'M12 5a3 3 0 1 0-5.997.125' }], ['circle', { cx: '12', cy: '12', r: '2', fill: 'currentColor' }]], box: [2, 2, 22, 22] };
    expect(migrate({ version: 2, conditions: [{ name: { en: '' }, primary: true, icon: lucide }] }).conditions[0].icon).toEqual(lucide);
    const upload = { kind: 'upload', mime: 'image/png', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' };
    expect(migrate({ version: 2, conditions: [{ name: { en: '' }, primary: true, icon: upload }] }).conditions[0].icon).toEqual(upload);
  });
  it('replaces values outside their lists with the defaults', () => {
    const s = migrate({ version: 2, format: 'poster', mode: 'triple', language: 'xx', theme: 'neon', font: 'comic', emblem: 'skull', qr: { size: 9 } });
    const d = defaultState();
    for (const key of ['format', 'mode', 'language', 'theme', 'font', 'emblem']) expect(s[key]).toBe(d[key]);
    expect(s.qr.size).toBe(14);
  });
  it('replaces a list whose items are not objects', () => {
    expect(migrate({ version: 2, contacts: ['<svg>'] }).contacts).toEqual(defaultState().contacts);
  });
});

import { describe, it, expect } from 'vitest';
import qrcode from 'qrcode-generator';
import { mecard, mecardFor, capacity, normalisePhone, qrMarkup } from '../src/card/qr.js';

describe('qr', () => {
  it('normalises phone numbers to digits with a leading plus', () => {
    expect(normalisePhone(' +44 7700 900123 ')).toBe('+447700900123');
    expect(normalisePhone('(044) 2345-6789')).toBe('04423456789');
  });
  it('builds a MECARD and skips empty numbers', () => {
    expect(mecard('Sara Kumar', ['+44 7700 900123', '', '12'])).toBe('MECARD:N:Sara Kumar (emergency contacts);TEL:+447700900123;;');
    expect(mecard('Sara', ['7700900123'], { note: 'Type 1 diabetes', address: '12, Main Road, Hillton' })).toBe('MECARD:N:Sara (emergency contacts);TEL:7700900123;NOTE:Type 1 diabetes;ADR:12 Main Road Hillton;;');
    expect(mecard('Sara', [])).toBeNull();
  });
  it('builds the payload from what the user ticked and reports capacity', () => {
    const state = {
      person: { name: { en: 'Gita Kumar' }, bloodGroup: 'A1+', address: { en: 'Park House, Lake Road, Hillton' } },
      conditions: [{ name: { en: 'Type 1 diabetes' }, primary: true }],
      contacts: [{ phone: '77009 00123' }, { phone: '77009 00456' }],
      hospital: { en: 'Riverside Medical Center' },
      qr: { on: true, size: 14, include: { condition: true, blood: true, hospital: false, address: true } },
    };
    const text = mecardFor(state, { bloodGroup: 'Blood group', hospital: 'Hospital' });
    expect(text).toContain('NOTE:Type 1 diabetes. Blood group A1+;');
    expect(text).toContain('ADR:Park House Lake Road Hillton;');
    expect(text).not.toContain('Riverside');
    const at14 = capacity(text, 14);
    const at18 = capacity(text, 18);
    expect(at14.verdict).toBe('dense');
    expect(at18.moduleMm).toBeGreaterThan(at14.moduleMm);
    expect(['easy', 'close']).toContain(at18.verdict);
  });
  it('keeps two numbers at a scannable module size at 14 mm', () => {
    const q = qrMarkup(mecard('Gita Kumar', ['+44 7700 900123', '+44 7700 900456']), 0, 0, 14, '#111');
    expect(q.modules).toBeLessThanOrEqual(37);
    expect(q.moduleMm).toBeGreaterThanOrEqual(0.37);
  });
  it('encodes names outside Latin-1 as UTF-8', () => {
    expect(qrcode.stringToBytes('é த')).toEqual([0xc3, 0xa9, 0x20, 0xe0, 0xae, 0xa4]);
  });
});

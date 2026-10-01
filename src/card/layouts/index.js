import single from './single.js';
import bilingual from './bilingual.js';
import phone from './phone.js';

export const layouts = { single, bilingual, phone };

export function layoutFor(mode) {
  const layout = layouts[mode];
  if (!layout) throw new Error(`Unknown layout mode: ${mode}`);
  return layout;
}

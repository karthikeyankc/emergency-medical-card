import id1Landscape from './id1-landscape.js';
import id2Landscape from './id2-landscape.js';
import phoneLockscreen from './phone-lockscreen.js';

export const formats = { [id1Landscape.id]: id1Landscape, [id2Landscape.id]: id2Landscape, [phoneLockscreen.id]: phoneLockscreen };

/** Names for the format menu. The phone format is not a card and is not offered here. */
export const formatNames = {
  'id1-landscape': 'Wallet card, 85.6 × 54 mm (bank card size)',
  'id2-landscape': 'Pocket card, 105 × 74 mm (A7), larger text',
};

export function formatFor(id) {
  const format = formats[id];
  if (!format) throw new Error(`Unknown format: ${id}`);
  return format;
}

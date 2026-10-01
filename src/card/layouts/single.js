/**
 * Single language. Content split across the two sides.
 * `language: 'primary'` resolves to state.language.
 * A block is a field id, or `{ columns: [fieldId, ...] }` to share a row.
 * `{ columns, widths }` sets relative column widths.
 * The front band carries the name, year of birth, and blood group, and the
 * strip under it carries the primary condition. The back has the emblem in
 * its top-right corner, so a finder holding it face down still sees a
 * medical card.
 */
export default {
  id: 'single',
  sides: {
    front: {
      language: 'primary',
      band: true,
      blocks: [{ columns: ['do', 'doNot'] }, 'carries'],
    },
    back: {
      language: 'primary',
      band: false,
      cornerEmblem: true,
      qr: true,
      date: true,
      blocks: [
        'medications',
        { columns: ['allergies', 'otherConditions'] },
        'contacts',
        { columns: ['hospital', 'emergency'] },
        'address',
      ],
    },
  },
};

/**
 * Phone lock screen. One side in the card's first language, everything in
 * one column, the front's content first. Nothing shares a row unless it is
 * short, so each item stays on one line at phone body-text size. No QR code:
 * a finder holding the phone cannot scan it with the same phone.
 */
export default {
  id: 'phone',
  sides: {
    screen: {
      language: 'primary',
      band: true,
      date: true,
      blocks: [
        'do',
        'doNot',
        'carries',
        'medications',
        { columns: ['allergies', 'otherConditions'] },
        'contacts',
        { columns: ['hospital', 'emergency'] },
        'address',
      ],
    },
  },
};

/**
 * Bilingual. The card's first language on the front, the second on the back,
 * the same fields on both. Each side is a complete card, so room is
 * tight: a one-line band with the chips moved onto the strip, 7 pt body
 * text, and the emergency number joins the contacts.
 */
const blocks = [
  { columns: ['do', 'doNot'] },
  { columns: ['medications', 'allergies'] },
  'contactsAndEmergency',
  'carries',
];

export default {
  id: 'bilingual',
  sides: {
    front: { language: 'primary', band: true, compact: true, blocks },
    back: { language: 'second', band: true, compact: true, date: true, blocks },
  },
};

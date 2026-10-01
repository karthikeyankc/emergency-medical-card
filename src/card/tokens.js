/**
 * Card tokens. Millimetres for geometry, points for type.
 * The renderer reads these directly so an exported SVG is self-contained.
 * scripts/build-tokens.mjs mirrors `colours` into src/styles/tokens.css.
 */

/** Millimetres per point. */
export const PT = 25.4 / 72;

/**
 * Band and strip colour pairs the user can choose. Every band colour keeps
 * white text at ΔL* 70 or more, every strip keeps ink at 70 or more. The
 * DO and DO NOT pair, the emblem, and the ink never change with the theme.
 */
export const palettes = {
  red: { name: 'Red', alert: '#7F1710', condition: '#F7C600' },
  blue: { name: 'Blue', alert: '#1E3A8A', condition: '#CFE3FF' },
  green: { name: 'Green', alert: '#14532D', condition: '#DDF3E2' },
  purple: { name: 'Purple', alert: '#4C1D95', condition: '#EBE2FF' },
  slate: { name: 'Slate', alert: '#1F2937', condition: '#E5E7EB' },
};

export const colours = {
  ink: '#111111',
  paper: '#FFFFFF',
  alert: '#7F1710',
  alertInk: '#FFFFFF',
  /** The DO NOT block. Fixed, whatever the band colour, so the pair keeps its meaning. */
  doNot: '#7F1710',
  /** DO label and icon. The one green on the card, paired with the red on DO NOT. ΔL* vs paper 71.5. */
  do: '#0B4E24',
  /** Condition strip under the band. Solid, ink text on it measures ΔL* 77. */
  condition: '#F7C600',
  ruleMuted: '#767676',
  /** Ground of the lock screen image around the card. Dark, so the phone's white clock stays readable. */
  lockGround: '#1C2024',
};

/**
 * Type styles. `size` in pt, `leading` as a multiple of size,
 * `tracking` in 1/1000 em, `caps` forces upper case before shaping.
 */
export const type = {
  body: { size: 7.5, leading: 1.2, weight: 400 },
  bodyBold: { size: 7.5, leading: 1.2, weight: 700 },
  label: { size: 6, leading: 1.2, weight: 700, caps: true, tracking: 40 },
  /** Knockout text on the band. 7 pt bold is the floor for knockout. */
  name: { size: 9, leading: 1.2, weight: 700 },
  chip: { size: 7, leading: 1.2, weight: 700, caps: true, tracking: 30 },
  alert: { size: 8, leading: 1.2, weight: 700, caps: true, tracking: 60 },
  /** Condition strip. Label and name share this one style. */
  condition: { size: 7, leading: 1.2, weight: 700, caps: true, tracking: 40 },
};

/**
 * Bilingual sides carry every field, so they use the compact set: 7 pt body
 * (the floor), a 7 pt alert label, and a one-line band.
 */
export const compactType = {
  ...type,
  body: { size: 7, leading: 1.2, weight: 400 },
  bodyBold: { size: 7, leading: 1.2, weight: 700 },
  alert: { size: 7, leading: 1.2, weight: 700, caps: true, tracking: 50 },
};

export const geometry = {
  cornerRadius: 3.18,
  safeMargin: 3,
  rule: 0.3 * PT,
  ruleMin: 0.25 * PT,
  /** Vertical gap between blocks, mm. */
  blockGap: 1.4,
  /** Gap between a label and its content, mm. */
  labelGap: 0.4,
  /** Gutter between columns, mm. */
  gutter: 3,
  /** Size of the emblem square in the alert band, mm. */
  emblem: 6,
  /** Default QR code side and its quiet zone, mm. The user can choose 14, 16, or 18. */
  qr: 14,
  qrQuiet: 1.6,
  /** Emblem in the compact one-line band, mm. */
  emblemCompact: 4,
  /** Emblem in the top-right corner of a side without a band, mm. */
  emblemCorner: 5,
  /** Section icons beside labels, mm. */
  labelIcon: 2.6,
  /** Icon in the condition strip, mm. */
  conditionIcon: 2.6,
  /** Condition strip height, mm. */
  strip: 5,
  /** Check or cross marking a DO or DO NOT item, mm. */
  markerIcon: 2.4,
  /** Hanging indent for marked items, mm. */
  hangingIndent: 3.2,
};

/** Floors the renderer asserts. */
export const floors = {
  minBodyPt: 7,
  minLabelPt: 6,
  minLeading: 1.2,
};

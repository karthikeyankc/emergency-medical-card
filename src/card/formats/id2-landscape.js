/**
 * ISO/IEC 7810 ID-2, landscape. The size of an A7 sheet and a German
 * identity card. Fits a shirt or jacket pocket rather than a card slot.
 *
 * A bigger card should carry bigger type, so this format draws on the
 * wallet card's grid scaled up by the width ratio: the canvas is 85.6 mm
 * wide and the SVG's physical size is 105 × 74 mm, which turns 7.5 pt body
 * text into about 9.2 pt and still leaves more room than the wallet card.
 */
import { geometry } from '../tokens.js';

const physicalWidth = 105;
const physicalHeight = 74;
const scale = physicalWidth / 85.6;
const width = 85.6;
const height = physicalHeight / scale;
const m = geometry.safeMargin;
const bandHeight = 13;
const compactBand = 10;
const stripHeight = geometry.strip;

export default {
  id: 'id2-landscape',
  width: physicalWidth,
  height: physicalHeight,
  /** Drawing units: everything below is in canvas mm, scaled to the physical size on output. */
  canvas: { width, height, scale },
  cornerRadius: geometry.cornerRadius / scale,
  safeMargin: m,
  sides: ['front', 'back'],
  regions: {
    /** Full-width alert band across the top. Text stays inside the safe margin. */
    band: { x: 0, y: 0, w: width, h: bandHeight, inset: m },
    /** One-line band for compact (bilingual) sides. */
    bandCompact: { x: 0, y: 0, w: width, h: compactBand, inset: m },
    /** Condition strip directly under the band. */
    strip: { x: 0, y: bandHeight, w: width, h: stripHeight, inset: m },
    stripCompact: { x: 0, y: compactBand, w: width, h: stripHeight, inset: m },
    /** Body below the compact band and strip. */
    bodyBelowCompact: { x: m, y: compactBand + stripHeight + 1.4, w: width - 2 * m, h: height - compactBand - stripHeight - 1.4 - m },
    /** Body below the band and strip. */
    bodyBelowBand: { x: m, y: bandHeight + stripHeight + 1.4, w: width - 2 * m, h: height - bandHeight - stripHeight - 1.4 - m },
    /** Body when the side has no band. */
    bodyFull: { x: m, y: m, w: width - 2 * m, h: height - 2 * m },
  },
};

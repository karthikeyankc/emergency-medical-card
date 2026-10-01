/**
 * ISO/IEC 7810 ID-1, landscape. All values in millimetres.
 * A format describes the surface only. Layouts decide what goes where.
 */
import { geometry } from '../tokens.js';

const width = 85.6;
const height = 53.98;
const m = geometry.safeMargin;
const bandHeight = 13;
const compactBand = 10;
const stripHeight = geometry.strip;

export default {
  id: 'id1-landscape',
  width,
  height,
  cornerRadius: geometry.cornerRadius,
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

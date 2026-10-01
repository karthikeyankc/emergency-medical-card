/**
 * Glyphs to SVG path data in millimetres.
 * Font units have y pointing up. SVG has y pointing down, so y is flipped
 * around the baseline.
 */
import { unitScale, trackingMm } from './paragraph.js';

const fmt = (n) => (Math.round(n * 1000) / 1000).toString();

/**
 * Path data for one laid-out line.
 * @param {ReturnType<import('./shaper.js').createShaper>} shaper
 * @param {{glyphs: object[]}} line
 * @param {number} x left edge, mm
 * @param {number} baseline y of the baseline, mm
 * @param {object} style
 */
export function linePath(shaper, line, x, baseline, style) {
  const parts = [];
  let pen = x;
  const track = trackingMm(style);
  for (const g of line.glyphs) {
    const k = unitScale(style, g.font.upem);
    const ox = pen + g.dx * k;
    const oy = baseline - g.dy * k;
    if (g.gid !== 0) {
      for (const cmd of shaper.outline(g.font, g.gid)) {
        const v = cmd.values;
        switch (cmd.type) {
          case 'M':
          case 'L':
            parts.push(`${cmd.type}${fmt(ox + v[0] * k)} ${fmt(oy - v[1] * k)}`);
            break;
          case 'Q':
            parts.push(`Q${fmt(ox + v[0] * k)} ${fmt(oy - v[1] * k)} ${fmt(ox + v[2] * k)} ${fmt(oy - v[3] * k)}`);
            break;
          case 'C':
            parts.push(
              `C${fmt(ox + v[0] * k)} ${fmt(oy - v[1] * k)} ${fmt(ox + v[2] * k)} ${fmt(oy - v[3] * k)} ${fmt(ox + v[4] * k)} ${fmt(oy - v[5] * k)}`,
            );
            break;
          case 'Z':
            parts.push('Z');
            break;
        }
      }
    }
    pen += g.ax * k + track;
  }
  return parts.join('');
}

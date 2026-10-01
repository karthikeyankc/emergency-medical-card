/**
 * A phone lock screen, portrait, pixel-native at 1080 × 2400. The output is
 * one image with a card-shaped panel on a plain ground, placed in the band
 * a lock screen leaves free between the clock at the top and the controls
 * at the bottom.
 *
 * The panel is the drawing canvas, so the layout maths is the one every
 * card uses. The `frame` is the whole screen. The renderer paints the
 * ground, moves to the panel's corner, and draws the side there. Sizes are
 * in canvas units: 78 units span the 1080 px width, so 7.5 pt body text
 * comes out at about 37 px, the size of body text on a phone.
 */
import { geometry, colours } from '../tokens.js';

const pxWidth = 1080;
const pxHeight = 2400;
const screenWidth = 78;
const scale = pxWidth / screenWidth;
const screenHeight = pxHeight / scale;
const sideMargin = 3;
/** Fractions of the height the clock and the bottom controls take. */
const freeTop = 0.22;
const freeBottom = 0.87;

const width = screenWidth - 2 * sideMargin;
const height = screenHeight * (freeBottom - freeTop);
const m = geometry.safeMargin;
const bandHeight = 13;
const compactBand = 10;
const stripHeight = geometry.strip;

export default {
  id: 'phone-lockscreen',
  width: pxWidth,
  height: pxHeight,
  units: 'px',
  canvas: { width, height, scale },
  frame: { width: screenWidth, height: screenHeight, x: sideMargin, y: screenHeight * freeTop, ground: colours.lockGround },
  cornerRadius: 3,
  safeMargin: m,
  sides: ['screen'],
  regions: {
    band: { x: 0, y: 0, w: width, h: bandHeight, inset: m },
    bandCompact: { x: 0, y: 0, w: width, h: compactBand, inset: m },
    strip: { x: 0, y: bandHeight, w: width, h: stripHeight, inset: m },
    stripCompact: { x: 0, y: compactBand, w: width, h: stripHeight, inset: m },
    bodyBelowCompact: { x: m, y: compactBand + stripHeight + 1.4, w: width - 2 * m, h: height - compactBand - stripHeight - 1.4 - m },
    bodyBelowBand: { x: m, y: bandHeight + stripHeight + 1.4, w: width - 2 * m, h: height - bandHeight - stripHeight - 1.4 - m },
    bodyFull: { x: m, y: m, w: width - 2 * m, h: height - 2 * m },
  },
};

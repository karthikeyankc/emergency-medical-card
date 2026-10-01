/**
 * Card emblems, drawn in-house. Each returns SVG markup for a square of
 * `size` mm at (x, y). Colours come from tokens so the SVG stays
 * self-contained.
 */
import { colours } from './tokens.js';

const f = (n) => Math.round(n * 1000) / 1000;

/** Red cross on a white field. Five equal squares, as the emblem is defined. */
function redCross(x, y, size) {
  const pad = size * 0.12;
  const ext = size - 2 * pad;
  const arm = ext / 3;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const d = [
    `M${f(cx - arm / 2)} ${f(y + pad)}`,
    `h${f(arm)} v${f(arm)} h${f(arm)} v${f(arm)} h${f(-arm)} v${f(arm)} h${f(-arm)} v${f(-arm)} h${f(-arm)} v${f(-arm)} h${f(arm)} Z`,
  ].join('');
  return (
    `<rect x="${f(x)}" y="${f(y)}" width="${f(size)}" height="${f(size)}" rx="${f(size * 0.12)}" fill="${colours.paper}"/>` +
    `<path d="${d}" fill="${colours.alert}"/>`
  );
}

/**
 * Rod of Asclepius. Outline from "Asclepius staff.svg" on Wikimedia Commons
 * by Lusanaherandraton, released into the public domain. Two paths in a 400.2 × 777.47
 * box, fitted upright into the white square.
 */
const ASCLEPIUS = {
  box: [400.2, 777.47],
  paths: ["M179.541 760.635c11.695 25.38 25.935 20.21 41.429 0 0 0 3.214-39.643 2.857-67.143-.357-27.5-4.643-2.5-4.286-42.857.357-40.357 5.714-118.571 5.714-118.571V399.206s1.786-71.428 1.429-131.428-3.571-65.357-2.857-108.572c.714-43.214 2.5-28.928 5.714-64.285a29764.04 29764.04 0 0 1 7.143-77.143c-7.253-23.837-76.565-22.964-84.286 22.857 0 0 4.286 27.143 5.715 87.143 1.428 60-3.572 82.5 0 152.857 3.571 70.357 10.357 62.857 14.285 128.571 3.929 65.715 1.429 134.286 1.429 134.286l5.714 132.857v84.286z", "M275.255 92.064c-49.285 3.928-121.428 14.285-121.428 14.285-232.95 43.227-175.653 247.878 4.286 201.429l70-4.286c95.515-23.275 111.676 104.895 0 88.572l-61.429 4.285C-1.49 437.941 16.011 594.764 170.97 573.492l54.285-8.571c119.133-2.609 53.143 80.894-4.285 87.143 0 0-16.429-1.072-42.857 14.285s-62.858 47.143-62.858 47.143c-27.447 36.386-4.811 29.836 20 21.429 0 0 19.286-17.857 41.429-28.572 22.143-10.714 47.143-14.285 47.143-14.285 135.292-46.872 151.142-157.506 4.286-161.429l-58.572 2.857c-45.625 16.901-138.931-54.211 0-90l61.429-1.428c173.364-5.928 176.96-172.33-4.286-181.429l-72.857 5.714c-81 37.088-166.122-63.739 1.428-108.571 0 0 41.786.714 74.286 0s26.429-5 55.714-2.857 41.395 21.798 61.429 11.428c47.251-24.456 86.009-25.93 4.286-75.714-21.81-13.286-26.429-2.5-75.715 1.429z"],
};

function rodOfAsclepius(x, y, size) {
  const pad = size * 0.12;
  const [bw, bh] = ASCLEPIUS.box;
  const k = (size - 2 * pad) / bh;
  const tx = x + (size - bw * k) / 2;
  const ty = y + pad;
  return (
    `<rect x="${f(x)}" y="${f(y)}" width="${f(size)}" height="${f(size)}" rx="${f(size * 0.12)}" fill="${colours.paper}"/>` +
    `<g transform="translate(${f(tx)} ${f(ty)}) scale(${f(k)})" fill="${colours.alert}">` +
    ASCLEPIUS.paths.map((d) => `<path d="${d}"/>`).join('') +
    `</g>`
  );
}

const emblems = {
  'red-cross': redCross,
  'rod-of-asclepius': rodOfAsclepius,
  none: null,
};

export function emblemMarkup(id, x, y, size) {
  const draw = emblems[id];
  return draw ? draw(x, y, size) : '';
}

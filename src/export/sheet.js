/**
 * The print-at-home sheet. The front and back of the card sit one above the
 * other on an A4 or Letter page, sharing an edge. Cut round the corner
 * marks, fold along the shared edge, and the back sits behind the front.
 *
 * The back is turned upside down on the sheet. Folding along a horizontal
 * line turns it over once and turning the card over sideways turns it
 * again, so the back reads the right way up when the card is turned over
 * sideways, like a page.
 *
 * Every mark sits outside the card, so nothing is printed on it. The
 * content fits inside both A4 and Letter, so either page prints the card at
 * its true size. Pure string work on the export SVGs, no DOM.
 */

/** Page sizes in millimetres, portrait. */
export const PAPER = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
};

const f = (n) => Math.round(n * 1000) / 1000;
const MARK = 4;
const MARK_GAP = 2;
const COPY_GAP = 14;
/** Room most home printers leave blank at the page edge, mm. */
const PRINTER_MARGIN = 5;
const STROKE = 0.25 * (25.4 / 72);

/** The content of an export SVG, scaled from its viewBox to its size in mm. */
function placed(svg, x, y, width, height, rotate = false) {
  const view = svg.match(/viewBox="([^"]+)"/)?.[1].split(/\s+/).map(Number) ?? [0, 0, width, height];
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const k = width / view[2];
  const turn = rotate ? ` rotate(180 ${f(width / 2)} ${f(height / 2)})` : '';
  return `<g transform="translate(${f(x)} ${f(y)})${turn} scale(${f(k)}) translate(${f(-view[0])} ${f(-view[1])})">${inner}</g>`;
}

/** L-shaped marks just outside each corner of a rectangle, and fold marks level with its middle. */
function marks(x, y, w, h, foldY) {
  const d = [];
  for (const [cx, sx] of [[x, -1], [x + w, 1]]) {
    for (const [cy, sy] of [[y, -1], [y + h, 1]]) {
      d.push(`M${f(cx + sx * MARK_GAP)} ${f(cy)}h${f(sx * MARK)}`);
      d.push(`M${f(cx)} ${f(cy + sy * MARK_GAP)}v${f(sy * MARK)}`);
    }
  }
  const fold = [`M${f(x - MARK_GAP - MARK)} ${f(foldY)}h${f(MARK)}`, `M${f(x + w + MARK_GAP)} ${f(foldY)}h${f(MARK)}`];
  return (
    `<path d="${d.join('')}" fill="none" stroke="#111111" stroke-width="${f(STROKE)}"/>` +
    `<path d="${fold.join('')}" fill="none" stroke="#111111" stroke-width="${f(STROKE)}" stroke-dasharray="1 0.8"/>`
  );
}

/**
 * @param {string} front export SVG of the front
 * @param {string} back export SVG of the back
 * @param {{ width: number, height: number }} card size in mm
 * @param {'a4'|'letter'} paper
 * @returns {{ svg: string, width: number, height: number }}
 */
export function printSheet(front, back, card, paper = 'a4') {
  const page = PAPER[paper] ?? PAPER.a4;
  const pairW = card.width;
  const pairH = card.height * 2;
  // Two copies side by side when they fit inside both paper sizes, one otherwise.
  const usable = Math.min(PAPER.a4.width, PAPER.letter.width) - 2 * (MARK_GAP + MARK + PRINTER_MARGIN);
  const copies = pairW * 2 + COPY_GAP <= usable ? 2 : 1;
  const totalW = copies * pairW + (copies - 1) * COPY_GAP;
  const x0 = (page.width - totalW) / 2;
  const y0 = 30;
  const parts = [`<rect width="${f(page.width)}" height="${f(page.height)}" fill="#FFFFFF"/>`];
  for (let i = 0; i < copies; i++) {
    const x = x0 + i * (pairW + COPY_GAP);
    parts.push(placed(front, x, y0, card.width, card.height));
    parts.push(placed(back, x, y0 + card.height, card.width, card.height, true));
    parts.push(marks(x, y0, pairW, pairH, y0 + card.height));
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${f(page.width)}mm" height="${f(page.height)}mm" viewBox="0 0 ${f(page.width)} ${f(page.height)}">` +
    parts.join('') +
    `</svg>`;
  return { svg, width: page.width, height: page.height };
}

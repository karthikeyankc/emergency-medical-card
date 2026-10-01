/**
 * Social preview image, built from the logo, a few lines of text in Inter
 * (the editor's typeface), and the example card in its own typeface. Laid
 * out at 1200 × 630 and rendered at twice that, 2400 × 1260, so text stays
 * sharp on high-density screens, where the README shows it 720 px wide.
 * Runs as part of `npm run build` so the picture always matches the card.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { loadNodeShaper, loadStrings, loadNumbers } from '../tests/helpers/node-context.mjs';
import { renderCard } from '../src/card/render.js';
import { migrate } from '../src/card/state.js';
import { layoutText, lineHeight } from '../src/card/text/paragraph.js';
import { PT } from '../src/card/tokens.js';
import { linePath } from '../src/card/text/outline.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shaper = loadNodeShaper(root);
const textShaper = loadNodeShaper(root, 'inter', []);
const ctx = { shaper, strings: loadStrings(root), numbers: loadNumbers(root), preview: true };
const example = migrate(JSON.parse(readFileSync(join(root, 'src', 'data', 'example-card.json'), 'utf8')));
const inner = (svg) => svg.trim().replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const card = inner(renderCard(example, ctx).sides.front.svg);
const logo = inner(readFileSync(join(root, 'public', 'logo.svg'), 'utf8'));

const MM = 96 / 25.4; // px per mm at CSS resolution
function text(str, style, colour, xPx, yPx, widthMm) {
  const laid = layoutText(textShaper, str, style, widthMm, 'en');
  const lh = lineHeight(style);
  const em = style.size * PT;
  const parts = laid.lines.map((line, i) => `<path d="${linePath(textShaper, line, 0, (lh - em) / 2 + em * 0.78 + i * lh, style)}" fill="${colour}"/>`);
  return { markup: `<g transform="translate(${xPx} ${yPx}) scale(${MM})">${parts.join('')}</g>`, heightPx: laid.lines.length * lh * MM };
}

let y = 250;
const blocks = [];
for (const [str, style, colour, gap] of [
  ['Emergency Medical Card', { size: 27, leading: 1.15, weight: 700 }, '#111111', 16],
  ["A free medical ID card for your wallet. It tells people how to help you when you can't speak for yourself.", { size: 15, leading: 1.35, weight: 400 }, '#374151', 14],
  ['Nothing you type leaves your browser.', { size: 13, leading: 1.4, weight: 600 }, '#7F1710', 0],
]) {
  const t = text(str, style, colour, 72, y, 132);
  blocks.push(t.markup);
  y += t.heightPx + gap;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#F3F0E9"/><!-- a warm grey on the yellow strip's hue, so the white card stands out -->
  <g transform="translate(72 96) scale(1.6)">${logo}</g>
  ${blocks.join('')}
  <g transform="translate(600 140) rotate(-4 260 160) scale(6.2)">
    <defs><clipPath id="c"><rect width="85.6" height="53.98" rx="3.18"/></clipPath></defs>
    <rect x="1" y="2" width="85.6" height="53.98" rx="3.18" fill="#000" opacity=".12"/>
    <g clip-path="url(#c)"><rect width="85.6" height="53.98" fill="#fff"/>${card}</g>
    <rect x="0.08" y="0.08" width="85.44" height="53.82" rx="3.1" fill="none" stroke="#111" stroke-opacity=".18" stroke-width=".16"/>
  </g>
</svg>`;
writeFileSync(join(root, 'public', 'og.png'), new Resvg(svg, { fitTo: { mode: 'width', value: 2400 } }).render().asPng());
console.log('wrote public/og.png');

// App icons. Phones ignore an SVG touch icon, and the web manifest needs PNGs at 192 and 512.
// The logo is wider than tall, so it sits centred on a white square.
const logoSvg = readFileSync(join(root, 'public', 'logo.svg'), 'utf8');
const logoInner = logoSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
for (const [file, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><rect width="64" height="64" fill="#FFFFFF"/><g transform="translate(4 16) scale(0.875)">${logoInner}</g></svg>`;
  writeFileSync(join(root, 'public', file), new Resvg(icon, { fitTo: { mode: 'width', value: size } }).render().asPng());
}
console.log('wrote public/apple-touch-icon.png, icon-192.png, icon-512.png');

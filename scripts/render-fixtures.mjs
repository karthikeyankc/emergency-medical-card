/**
 * Render every fixture in tests/fixtures to SVG and PNG under .fixtures-out/.
 * A development aid for looking at the card without the browser.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { loadNodeShaper, loadStrings, loadNumbers, latinFamilies } from '../tests/helpers/node-context.mjs';
import { renderCard } from '../src/card/render.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = join(root, '.fixtures-out');
mkdirSync(out, { recursive: true });

const shaper = loadNodeShaper(root);
const ctx = { shaper, strings: loadStrings(root), numbers: loadNumbers(root) };

const fixtures = readdirSync(join(root, 'tests', 'fixtures')).filter((f) => f.endsWith('.json'));
for (const file of fixtures) {
  const state = JSON.parse(readFileSync(join(root, 'tests', 'fixtures', file), 'utf8'));
  const name = basename(file, '.json');
  for (const preview of [true, false]) {
    const t0 = performance.now();
    const result = renderCard(state, { ...ctx, preview });
    const ms = (performance.now() - t0).toFixed(1);
    for (const [side, r] of Object.entries(result.sides)) {
      const tag = preview ? 'preview' : 'export';
      const svgPath = join(out, `${name}.${side}.${tag}.svg`);
      writeFileSync(svgPath, r.svg);
      const png = new Resvg(r.svg, { fitTo: { mode: 'width', value: 2022 } }).render().asPng();
      writeFileSync(join(out, `${name}.${side}.${tag}.png`), png);
      console.log(`${name} ${side} ${tag}: ${ms} ms, fill ${(r.fill * 100).toFixed(0)}%, overflow [${r.overflow}], missing ${JSON.stringify(r.missing)}`);
    }
  }
}

// The single-language front in every Latin family, for comparing typefaces.
const single = JSON.parse(readFileSync(join(root, 'tests', 'fixtures', 'single-en.json'), 'utf8'));
for (const id of Object.keys(latinFamilies(root))) {
  const r = renderCard({ ...single, font: id }, { ...ctx, shaper: loadNodeShaper(root, id), preview: true });
  const png = new Resvg(r.sides.front.svg, { fitTo: { mode: 'width', value: 2022 } }).render().asPng();
  writeFileSync(join(out, `font.${id}.front.png`), png);
  console.log(`font ${id.padEnd(18)} front fill ${(r.sides.front.fill * 100).toFixed(0)}%  back fill ${(r.sides.back.fill * 100).toFixed(0)}%`);
}

/**
 * Copy the Lucide icons the card uses into src/card/icons.js as plain data,
 * so the renderer has no dependency and an exported SVG stays self-contained.
 * Lucide is ISC licensed. Run after changing ICONS or upgrading @lucide/astro.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { svgPathBbox } from 'svg-path-bbox';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', '@lucide', 'astro', 'src', 'icons');

/** Card meaning → Lucide icon name. */
const ICONS = {
  generic: 'stethoscope',
  condition: 'stethoscope',
  do: 'circle-check',
  doNot: 'ban',
  doItem: 'check',
  doNotItem: 'x',
  carries: 'backpack',
  medications: 'pill',
  allergies: 'triangle-alert',
  contacts: 'phone',
  hospital: 'hospital',
  emergency: 'siren',
  otherConditions: 'clipboard-list',
  address: 'map-pin',
  born: 'calendar',
  blood: 'droplet',
};

const nodes = {};
for (const [key, name] of Object.entries(ICONS)) {
  const file = readFileSync(join(src, `${name}.ts`), 'utf8');
  const match = file.match(/const iconData: LucideIconData = (\{.*?\});/s);
  if (!match) throw new Error(`No icon data in ${name}.ts`);
  const node = JSON.parse(match[1]).node;
  nodes[key] = { name, node, box: bbox(node) };
}

/** Bounding box of the drawn shapes in the 24-unit space, so the renderer can centre what is visible. */
function bbox(node) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (a, b, c, d) => { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d); };
  for (const [tag, a] of node) {
    if (tag === 'path') grow(...svgPathBbox(a.d));
    else if (tag === 'circle') grow(+a.cx - +a.r, +a.cy - +a.r, +a.cx + +a.r, +a.cy + +a.r);
    else if (tag === 'rect') grow(+a.x, +a.y, +a.x + +a.width, +a.y + +a.height);
    else if (tag === 'line') grow(Math.min(+a.x1, +a.x2), Math.min(+a.y1, +a.y2), Math.max(+a.x1, +a.x2), Math.max(+a.y1, +a.y2));
  }
  const r = (n) => Math.round(n * 100) / 100;
  return [r(x0), r(y0), r(x1), r(y1)];
}

const out = `/**
 * Icons used on the card, copied from Lucide (ISC, https://lucide.dev) by
 * scripts/build-icons.mjs. Do not edit by hand. Strokes stay strokes: SVG,
 * PDF, and PNG all render them.
 */
const f = (n) => Math.round(n * 1000) / 1000;

export const ICONS = ${JSON.stringify(nodes, null, 2)};

/**
 * A Lucide icon as an SVG group scaled to \`size\` mm, with the visible
 * shape (not the 24-unit box) centred in the square at (x, y).
 */
export function iconMarkup(key, x, y, size, colour) {
  const icon = ICONS[key] ?? ICONS.generic;
  const k = size / 24;
  const [bx0, by0, bx1, by1] = icon.box;
  const tx = x + size / 2 - (k * (bx0 + bx1)) / 2;
  const ty = y + size / 2 - (k * (by0 + by1)) / 2;
  const inner = icon.node
    .map(([tag, attrs]) => \`<\${tag} \${Object.entries(attrs).map(([a, v]) => \`\${a}="\${v}"\`).join(' ')}/>\`)
    .join('');
  return (
    \`<g transform="translate(\${f(tx)} \${f(ty)}) scale(\${f(k)})" fill="none" stroke="\${colour}" \` +
    \`stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\${inner}</g>\`
  );
}

/** An icon given as data ({ node, box }), for icons the user picked. */
export function inlineIconMarkup(icon, x, y, size, colour) {
  const k = size / 24;
  const [bx0, by0, bx1, by1] = icon.box ?? [0, 0, 24, 24];
  const tx = x + size / 2 - (k * (bx0 + bx1)) / 2;
  const ty = y + size / 2 - (k * (by0 + by1)) / 2;
  const inner = icon.node
    .map(([tag, attrs]) => \`<\${tag} \${Object.entries(attrs).map(([a, v]) => \`\${a}="\${v}"\`).join(' ')}/>\`)
    .join('');
  return (
    \`<g transform="translate(\${f(tx)} \${f(ty)}) scale(\${f(k)})" fill="none" stroke="\${colour}" \` +
    \`stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\${inner}</g>\`
  );
}

export function genericIcon(x, y, size, colour) {
  return iconMarkup('generic', x, y, size, colour);
}
`;
writeFileSync(join(root, 'src', 'card', 'icons.js'), out);
console.log(`wrote ${Object.keys(nodes).length} icons`);

// Every Lucide icon as data for the condition icon picker. Loaded only when
// the picker opens. Names double as the search index.
const all = [];
for (const file of readdirSync(src).filter((f) => f.endsWith('.ts')).sort()) {
  const text = readFileSync(join(src, file), 'utf8');
  const match = text.match(/const iconData: LucideIconData = (\{.*?\});/s);
  if (!match) continue;
  const data = JSON.parse(match[1]);
  all.push({ name: data.name, node: data.node, box: bbox(data.node) });
}
writeFileSync(join(root, 'src', 'data', 'lucide-icons.json'), JSON.stringify(all));
console.log(`wrote ${all.length} icons for the picker`);

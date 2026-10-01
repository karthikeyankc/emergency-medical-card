/**
 * Fetch a curated set of public symbols from Wikimedia Commons for the
 * icon picker's Symbols tab, clean them, and write src/data/symbols.json.
 * Networked, run by hand. Only public domain and Creative Commons files
 * are kept, and each entry records its author, licence, and page so the
 * picker can show them.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'emergency-medical-card/0.1 (symbol picker build)';

/** Commons file → what it stands for, in the picker's words. */
const SYMBOLS = [
  ['File:Blue circle for diabetes.svg', 'Blue circle', 'Diabetes'],
  ['File:Autism spectrum infinity awareness symbol.svg', 'Infinity', 'Autism'],
  ['File:International Symbol of Access.svg', 'Wheelchair', 'Mobility, disability'],
  ['File:Asclepius staff.svg', 'Rod of Asclepius', 'Medicine'],
  ['File:Purple ribbon.svg', 'Purple ribbon', 'Epilepsy, Alzheimer’s'],
  ['File:Grey ribbon.svg', 'Grey ribbon', 'Diabetes, asthma, brain cancer'],
  ['File:Gray ribbon.svg', 'Grey ribbon', 'Diabetes, asthma, brain cancer'],
  ['File:Orange ribbon.svg', 'Orange ribbon', 'Multiple sclerosis, ADHD, leukaemia'],
  ['File:Green ribbon.svg', 'Green ribbon', 'Mental health, kidney disease, organ donation'],
  ['File:Teal ribbon.svg', 'Teal ribbon', 'Ovarian cancer, PTSD, anxiety'],
  ['File:Light blue ribbon.svg', 'Light blue ribbon', 'Prostate cancer'],
  ['File:Pink ribbon.svg', 'Pink ribbon', 'Breast cancer'],
  ['File:Yellow ribbon.svg', 'Yellow ribbon', 'Bladder cancer, suicide prevention'],
  ['File:Burgundy ribbon.svg', 'Burgundy ribbon', 'Sickle cell disease'],
  ['File:Periwinkle ribbon.svg', 'Periwinkle ribbon', 'Stomach cancer, eating disorders'],
  ['File:Silver ribbon.svg', 'Silver ribbon', 'Parkinson’s, brain disorders'],
  ['File:White ribbon.svg', 'White ribbon', 'Lung cancer'],
];
const ALLOWED = /public domain|cc0|cc by/i;

const titles = SYMBOLS.map(([t]) => t);
const api = `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata&format=json&titles=${encodeURIComponent(titles.join('|'))}`;
const res = await fetch(api, { headers: { 'User-Agent': UA } });
const data = await res.json();
const pages = Object.values(data.query.pages);

const strip = (html) => String(html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

let currentTitle = '';
const pageTitleToId = (title) => title.replace(/^File:/, '').replace(/\.svg$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

function clean(svg) {
  let s = svg.replace(/<\?xml[^>]*>/g, '').replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of ['script', 'foreignObject', 'metadata', 'title', 'desc', 'style']) s = s.replace(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
  s = s.replace(/<(sodipodi|inkscape|rdf|cc|dc):[^>]*\/>/g, '').replace(/<(sodipodi|inkscape|rdf|cc|dc):[\s\S]*?<\/\1:[^>]*>/g, '');
  s = s.replace(/\s(sodipodi|inkscape|xlink:title|xmlns:\w+)="[^"]*"/g, (m) => (m.startsWith(' xmlns:xlink') ? m : ''));
  s = s.replace(/\son\w+="[^"]*"/g, '').replace(/\s(href|xlink:href)="(?!#)[^"]*"/g, '');
  // Inline style attributes are blocked by the site's Content Security Policy.
  // Turn the presentation ones into plain attributes and drop the rest.
  const KEEP = new Set(['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-opacity', 'stroke-opacity', 'opacity', 'fill-rule', 'stroke-miterlimit', 'stroke-dasharray', 'stop-color', 'stop-opacity', 'display']);
  s = s.replace(/\sstyle="([^"]*)"/g, (m, decls) => {
    const attrs = decls.split(';').map((d) => d.split(':').map((x) => x.trim())).filter(([k, v]) => k && v && KEEP.has(k)).map(([k, v]) => `${k}="${v}"`);
    return attrs.length ? ' ' + attrs.join(' ') : '';
  });
  // Files from the same author reuse ids like linearGradient6097. Several
  // symbols share one page, so every id gets the symbol's own prefix.
  const prefix = pageTitleToId(currentTitle);
  for (const id of new Set([...s.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]))) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    s = s.replace(new RegExp(`\\bid="${esc}"`, 'g'), `id="${prefix}-${id}"`);
    s = s.replace(new RegExp(`url\\(#${esc}\\)`, 'g'), `url(#${prefix}-${id})`);
    s = s.replace(new RegExp(`href="#${esc}"`, 'g'), `href="#${prefix}-${id}"`);
  }
  const open = s.match(/<svg[\s>][^>]*>/i);
  if (!open) throw new Error(`no <svg> (starts: ${s.slice(0, 80).replace(/\s+/g, ' ')})`);
  const attrs = open[0];
  let viewBox = attrs.match(/viewBox="([^"]+)"/)?.[1];
  if (!viewBox) {
    const w = parseFloat(attrs.match(/\swidth="([\d.]+)/)?.[1] ?? '0');
    const h = parseFloat(attrs.match(/\sheight="([\d.]+)/)?.[1] ?? '0');
    if (!w || !h) throw new Error('no size');
    viewBox = `0 0 ${w} ${h}`;
  }
  const inner = s.slice(s.indexOf(open[0]) + open[0].length, s.lastIndexOf('</svg>')).trim();
  return { viewBox, markup: inner.replace(/\s+/g, ' ') };
}

// Resumable: keep what an earlier run fetched, so a rate limit only costs the rest.
const existingPath = join(root, 'src', 'data', 'symbols.json');
const out = existsSync(existingPath) ? JSON.parse(readFileSync(existingPath, 'utf8')) : [];
const seen = new Set(out.map((o) => o.name));
let limited = false;
for (const page of pages) {
  if (page.missing !== undefined) continue;
  const spec = SYMBOLS.find(([t]) => t === page.title);
  if (!spec || seen.has(spec[1])) continue;
  const info = page.imageinfo[0];
  const meta = info.extmetadata ?? {};
  const licence = strip(meta.LicenseShortName?.value);
  if (!ALLOWED.test(licence)) { console.log(`skip ${page.title}: ${licence}`); continue; }
  // upload.wikimedia.org rate-limits bursts with a 429 and a Retry-After of minutes.
  // Honour short waits, and stop politely on long ones. Rerun later for the rest.
  if (limited) continue;
  await new Promise((r) => setTimeout(r, 1500));
  const res = await fetch(info.url, { headers: { 'User-Agent': UA } });
  if (res.status === 429) {
    const wait = Number(res.headers.get('retry-after') ?? 60);
    if (wait > 90) { console.log(`rate limited, retry after ${wait} s. Run this script again later for the remaining files.`); limited = true; continue; }
    await new Promise((r) => setTimeout(r, wait * 1000 + 500));
  }
  const svg = res.status === 429 ? await (await fetch(info.url, { headers: { 'User-Agent': UA } })).text() : await res.text();
  if (svg.length > 40000) { console.log(`skip ${page.title}: ${(svg.length / 1024).toFixed(0)} KB`); continue; }
  let cleaned;
  try {
    currentTitle = page.title;
    cleaned = clean(svg);
  } catch (err) {
    console.log(`skip ${page.title}: ${err.message}`);
    continue;
  }
  const { viewBox, markup } = cleaned;
  seen.add(spec[1]);
  out.push({
    id: page.title.replace(/^File:/, '').replace(/\.svg$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: spec[1],
    meaning: spec[2],
    viewBox,
    markup,
    author: strip(meta.Artist?.value) || 'Unknown',
    licence,
    licenceUrl: strip(meta.LicenseUrl?.value) || null,
    page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
  });
  console.log(`${page.title.padEnd(52)} ${licence.padEnd(16)} ${(markup.length / 1024).toFixed(1)} KB`);
}
out.sort((a, b) => SYMBOLS.findIndex(([, n]) => n === a.name) - SYMBOLS.findIndex(([, n]) => n === b.name));
writeFileSync(existingPath, JSON.stringify(out, null, 1));
console.log(`\nwrote ${out.length} symbols${limited ? ', more to fetch on a later run' : ''}`);

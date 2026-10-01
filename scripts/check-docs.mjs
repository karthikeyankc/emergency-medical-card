/**
 * Fails when the documents drift from the code. Runs before every commit
 * (.githooks/pre-commit) and in CI. It checks what can be checked without
 * reading prose for meaning.
 *
 * - Every repo path and relative link in the Markdown files exists.
 * - Every `npm run <script>` the documents mention is in package.json.
 * - The CSP quoted in AGENTS.md is the one in src/headers.js.
 * - The colour tokens in the AGENTS.md table match src/card/tokens.js.
 * - Counts the documents state match the data they describe.
 * - NOTICE.md names every bundled typeface.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csp } from '../src/headers.js';
import { colours } from '../src/card/tokens.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const problems = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);

const docs = ['README.md', 'AGENTS.md', 'AI.md', 'CONTRIBUTING.md', 'SECURITY.md', 'NOTICE.md', ...readdirSync(join(root, 'docs')).filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`)];
const text = Object.fromEntries(docs.map((d) => [d, read(d)]));

/* Paths and links */
const TOP = /^(src|scripts|tests|docs|content|public|\.github|\.githooks)\//;
for (const [file, body] of Object.entries(text)) {
  const base = dirname(file);
  for (const [, target] of body.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
    if (/^[a-z]+:/i.test(target)) continue;
    if (!existsSync(join(root, base, target)) && !existsSync(join(root, target))) fail(file, `link to missing ${target}`);
  }
  for (const [, path] of body.matchAll(/`([^`\s]+)`/g)) {
    if (!TOP.test(path) || /[<>*{}]/.test(path)) continue;
    if (!existsSync(join(root, path.replace(/\/$/, '')))) fail(file, `mentions missing ${path}`);
  }
}

/* npm scripts */
const scripts = json('package.json').scripts;
for (const [file, body] of Object.entries(text)) {
  for (const [, name] of body.matchAll(/npm run ([a-z][\w:-]*)/g)) if (!scripts[name]) fail(file, `npm run ${name} is not in package.json`);
}

/* The CSP */
const quoted = text['AGENTS.md'].match(/is `(default-src[^`]+)`/)?.[1];
if (quoted !== csp) fail('AGENTS.md', 'the CSP it quotes differs from src/headers.js');

/* Colour tokens */
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
for (const [, name, value] of text['AGENTS.md'].matchAll(/^\| `([a-z-]+)` \| `(#[0-9A-Fa-f]{6})` \|/gm)) {
  const actual = colours[camel(name)];
  if (!actual) fail('AGENTS.md', `token ${name} is not in tokens.js`);
  else if (actual.toUpperCase() !== value.toUpperCase()) fail('AGENTS.md', `token ${name} is ${value}, tokens.js says ${actual}`);
}

/* Counts */
const WORDS = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30 };
const num = (s) => (/^\d+$/.test(s) ? Number(s) : WORDS[s.toLowerCase()]);
const languages = json('src/data/languages.json').languages;
const available = languages.filter((l) => !l.unsupported).length;
const catalogue = json('src/data/conditions.json').conditions;
const manifest = json('src/fonts/manifest.json');
const notoScripts = Object.values(manifest.scripts).filter((s) => s.file).length;
const symbols = json('src/data/symbols.json').length;
const numbers = Object.keys(json('src/data/emergency-numbers.json')).filter((k) => !k.startsWith('_')).length;
const faq = json('src/data/i18n/ui/en.json').faq.length;
const facts = [
  [/lists (\w+) languages/g, languages.length, 'languages listed'],
  [/any of the (\w+) that are available/g, available, 'languages available'],
  [/from (\d+) languages/g, available, 'languages available'],
  [/holds (\w+) conditions/g, catalogue.length, 'conditions in the catalogue'],
  [/(\w+) carry prefill/g, catalogue.filter((c) => c.prefill).length, 'conditions with prefill'],
  [/Noto Sans font under `src\/fonts\/noto\/`, (\w+) today/g, notoScripts, 'Noto script fonts'],
  [/holds (\w+) marks from Wikimedia Commons/g, symbols, 'Commons symbols'],
  [/table covers (\d+) countries/g, numbers, 'countries in the emergency number table'],
  [/(\w+) short answers/g, faq, 'FAQ answers'],
];
for (const [file, body] of Object.entries(text)) {
  for (const [pattern, expected, what] of facts) {
    for (const m of body.matchAll(pattern)) if (num(m[1]) !== expected) fail(file, `says ${m[0]}, but there are ${expected} ${what}`);
  }
}

/* Every bundled typeface is credited */
const families = [...Object.values(manifest.latin).map((f) => f.family.replace(/ Condensed$/, '')), manifest.fallback.family];
for (const fam of new Set(families)) if (!text['NOTICE.md'].includes(fam)) fail('NOTICE.md', `does not credit ${fam}`);
for (const s of Object.values(manifest.scripts)) {
  if (!s.file) continue;
  const short = s.family.replace('Noto Sans ', '');
  if (!text['NOTICE.md'].includes(short)) fail('NOTICE.md', `does not credit ${s.family}`);
}

if (problems.length) {
  console.error(`The documents have drifted from the code:\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
console.log('docs match the code');

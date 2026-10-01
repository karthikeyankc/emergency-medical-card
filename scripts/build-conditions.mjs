/**
 * Build src/data/conditions.json from content/conditions.seed.yaml.
 *
 * The only script in the project that touches the network. For every seed
 * entry with a Wikidata id it fetches the label and aliases in each
 * supported language. Seed `name` and `aliases` override and extend what
 * comes back. The output is committed. The app build never runs this.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import yaml from 'js-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seed = yaml.load(readFileSync(join(root, 'content', 'conditions.seed.yaml'), 'utf8'));
const languages = seed.languages;
const out = join(root, 'src', 'data', 'conditions.json');

// Wikidata sometimes files a label under the wrong language. A name that is
// not written in the language's own script is dropped with a warning.
const catalogueLanguages = JSON.parse(readFileSync(join(root, 'src', 'data', 'languages.json'), 'utf8')).languages;
const fontScripts = JSON.parse(readFileSync(join(root, 'src', 'fonts', 'manifest.json'), 'utf8')).scripts;
function inScript(text, lang) {
  const key = catalogueLanguages.find((l) => l.id === lang)?.script;
  const unicode = key === 'latin' ? 'Latin' : fontScripts[key]?.unicode;
  if (!unicode) return true;
  const letters = [...text].filter((ch) => /\p{L}/u.test(ch));
  return letters.length > 0 && letters.every((ch) => new RegExp(`\\p{Script=${unicode}}`, 'u').test(ch));
}

const API = 'https://www.wikidata.org/w/api.php';
const UA = 'emergency-medical-card/0.1 (https://github.com/KarthikeyanKC/emergency-medical-card; catalogue refresh script)';

async function fetchEntities(ids) {
  const results = {};
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url = `${API}?action=wbgetentities&ids=${batch.join('|')}&props=labels|aliases|descriptions&languages=${languages.join('|')}&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Wikidata ${res.status} for ${batch.join(',')}`);
    const json = await res.json();
    Object.assign(results, json.entities ?? {});
  }
  return results;
}

const withIds = seed.conditions.filter((c) => c.wikidata);
const entities = await fetchEntities(withIds.map((c) => c.wikidata));

const warnings = [];
const conditions = seed.conditions.map((c) => {
  const entity = c.wikidata ? entities[c.wikidata] : null;
  if (c.wikidata && (!entity || entity.missing !== undefined)) warnings.push(`${c.id}: ${c.wikidata} not found`);
  const name = {};
  const aliases = {};
  for (const lang of languages) {
    let label = entity?.labels?.[lang]?.value;
    if (label && !inScript(label, lang)) {
      warnings.push(`${c.id}: dropped ${lang} label "${label}", not in the language's script`);
      label = null;
    }
    name[lang] = c.name?.[lang] ?? (label ? label.charAt(0).toLocaleUpperCase(lang) + label.slice(1) : null);
    const fromWikidata = (entity?.aliases?.[lang] ?? []).map((a) => a.value).filter((a) => {
      if (inScript(a, lang)) return true;
      warnings.push(`${c.id}: dropped ${lang} alias "${a}", not in the language's script`);
      return false;
    });
    aliases[lang] = [...new Set([...(c.aliases?.[lang] ?? []), ...fromWikidata])];
    if (!name[lang]) warnings.push(`${c.id}: no ${lang} name`);
  }
  if (entity?.descriptions?.en?.value) {
    // Surface the English description so a seed pointing at the wrong item is caught.
    console.log(`${c.id.padEnd(26)} ${c.wikidata.padEnd(10)} ${name.en}  (${entity.descriptions.en.value})`);
  }
  const entry = { id: c.id, wikidata: c.wikidata ?? null, name, aliases };
  if (c.prefill) {
    if (!c.prefill.sources?.length || c.prefill.sources.some((s) => !s.reviewedOn)) {
      throw new Error(`${c.id}: prefill needs sources[] with reviewedOn`);
    }
    entry.prefill = c.prefill;
    entry.reviewedBy = c.reviewedBy ?? null;
  }
  return entry;
});

writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), languages, conditions }, null, 2) + '\n');
console.log(`\nwrote ${conditions.length} conditions to ${out}`);
if (warnings.length) {
  console.log('\nwarnings:');
  for (const w of warnings) console.log(`  ${w}`);
}

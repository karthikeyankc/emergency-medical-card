/**
 * Load fonts and build the shaper in the browser. The Latin family is the
 * user's choice from the manifest, fetched when first selected and cached.
 * Other scripts use their Noto font. Noto Sans fills characters the Latin
 * family lacks, and loads only when asked for. Vite emits every TTF as a
 * same-origin asset.
 */
import manifest from '../fonts/manifest.json';
import languagesData from '../data/languages.json';

// Vite gives every TTF under src/fonts a same-origin URL. Fonts load only when needed.
const urls = import.meta.glob('../fonts/**/*.ttf', { eager: true, query: '?url', import: 'default' });
const URLS = Object.fromEntries(Object.entries(urls).map(([k, v]) => [k.replace('../fonts/', ''), v]));

const cache = new Map();
async function buffer(file) {
  if (!cache.has(file)) {
    cache.set(
      file,
      fetch(URLS[file]).then((res) => {
        if (!res.ok) throw new Error(`Font failed to load: ${file}`);
        return res.arrayBuffer();
      }),
    );
  }
  return cache.get(file);
}

const FAMILIES = manifest.latin;
const DEFAULT_FAMILY = manifest.defaultLatin;

/** The manifest scripts the card's languages need, beyond Latin. */
export function scriptsFor(state) {
  const ids = state.mode === 'bilingual' ? [state.language, state.secondLanguage] : [state.language];
  const scripts = new Set();
  for (const id of ids) {
    const lang = languagesData.languages.find((l) => l.id === id);
    if (lang && manifest.scripts[lang.script]?.file) scripts.add(lang.script);
  }
  return [...scripts];
}

/** Characters the fallback font can fill: Latin, Greek, Cyrillic, and shared punctuation. */
const FALLBACK_COVERS = /[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{Script=Common}\p{Script=Inherited}]/u;

/** @param {Record<string, string[]>} missing field → characters no loaded font has */
export function fallbackWouldHelp(missing) {
  return Object.values(missing).some((chars) => chars.some((c) => FALLBACK_COVERS.test(c)));
}

/**
 * @param {string} fontId a manifest family id, or 'custom'
 * @param {object|null} custom the stored custom font record, when fontId is 'custom'
 * @param {string[]} scripts manifest script keys to load beyond Latin
 * @param {boolean} [withFallback] also load Noto Sans for characters the Latin family lacks
 */
export async function loadShaper(fontId = DEFAULT_FAMILY, custom = null, scripts = ['tamil'], withFallback = false) {
  const { createShaper } = await import('../card/text/shaper.js');
  let latinFiles;
  if (fontId === 'custom' && custom) {
    const { customFontFiles } = await import('../card/text/fontfile.js');
    latinFiles = customFontFiles(custom);
  } else {
    const latin = FAMILIES[fontId] ?? FAMILIES[DEFAULT_FAMILY];
    const data = await buffer(latin.file);
    latinFiles = {
      400: { data, variations: { ...latin.axes, wght: 400 } },
      700: { data, variations: { ...latin.axes, wght: 700 } },
    };
  }
  const files = { latin: latinFiles };
  if (withFallback) {
    const fallback = manifest.fallback.files;
    files.fallback = { 400: { data: await buffer(fallback[400]) }, 700: { data: await buffer(fallback[700]) } };
  }
  await Promise.all(
    scripts.map(async (script) => {
      const entry = manifest.scripts[script];
      if (!entry?.file) return;
      const data = await buffer(entry.file);
      files[script] = { 400: { data, variations: { wght: 400 } }, 700: { data, variations: { wght: 700 } } };
    }),
  );
  return createShaper(files, Object.fromEntries(Object.entries(manifest.scripts).map(([k, v]) => [k, v.unicode])));
}

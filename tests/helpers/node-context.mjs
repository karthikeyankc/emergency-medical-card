/**
 * Load fonts, strings, and numbers from disk for Node renders and tests.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createShaper } from '../../src/card/text/shaper.js';

function arrayBuffer(path) {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

/**
 * Font files in the shape createShaper takes: the Latin family plus one
 * variable Noto font per requested script. Tests load Tamil by default.
 */
export function fontFilesFor(root, fontId, scripts = ['tamil'], withFallback = false) {
  const manifest = JSON.parse(readFileSync(join(root, 'src', 'fonts', 'manifest.json'), 'utf8'));
  const latin = manifest.latin[fontId] ?? manifest.latin[manifest.defaultLatin];
  const latinData = arrayBuffer(join(root, 'src', 'fonts', latin.file));
  const files = { latin: {} };
  for (const weight of [400, 700]) files.latin[weight] = { data: latinData, variations: { ...latin.axes, wght: weight } };
  for (const script of scripts) {
    const entry = manifest.scripts[script];
    if (!entry?.file) continue;
    const data = arrayBuffer(join(root, 'src', 'fonts', entry.file));
    files[script] = {};
    for (const weight of [400, 700]) files[script][weight] = { data, variations: { wght: weight } };
  }
  if (withFallback) {
    files.fallback = {};
    for (const weight of [400, 700]) files.fallback[weight] = { data: arrayBuffer(join(root, 'src', 'fonts', manifest.fallback.files[weight])) };
  }
  return files;
}

export function scriptMap(root) {
  const manifest = JSON.parse(readFileSync(join(root, 'src', 'fonts', 'manifest.json'), 'utf8'));
  return Object.fromEntries(Object.entries(manifest.scripts).map(([k, v]) => [k, v.unicode]));
}

export function loadNodeShaper(root, fontId, scripts, withFallback) {
  return createShaper(fontFilesFor(root, fontId, scripts, withFallback), scriptMap(root));
}

export function latinFamilies(root) {
  return JSON.parse(readFileSync(join(root, 'src', 'fonts', 'manifest.json'), 'utf8')).latin;
}

export function loadStrings(root) {
  const dir = join(root, 'src', 'data', 'i18n', 'card');
  const { languages } = JSON.parse(readFileSync(join(root, 'src', 'data', 'languages.json'), 'utf8'));
  return Object.fromEntries(languages.filter((l) => existsSync(join(dir, `${l.id}.json`))).map((l) => [l.id, JSON.parse(readFileSync(join(dir, `${l.id}.json`), 'utf8'))]));
}

export function loadNumbers(root) {
  return JSON.parse(readFileSync(join(root, 'src', 'data', 'emergency-numbers.json'), 'utf8'));
}

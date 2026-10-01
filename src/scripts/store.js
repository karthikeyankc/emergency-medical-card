/**
 * One state object, saved to localStorage on every change, with
 * subscribers notified after each set.
 */
import { defaultState, migrate } from '../card/state.js';

export const STORAGE_KEY = 'medical-card:v1';

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (o[k] == null || typeof o[k] !== 'object') o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    o = o[k];
  }
  o[keys[keys.length - 1]] = value;
}

/**
 * Ask the browser not to evict this origin's storage under pressure. Best
 * effort. Chromium grants it silently for sites the person uses, Safari
 * ignores it. The backup file remains the only durable copy.
 */
export function requestPersistence() {
  try {
    return navigator.storage?.persist?.() ?? Promise.resolve(false);
  } catch {
    return Promise.resolve(false);
  }
}

/** True when nothing meaningful has been typed yet. */
export function isBlank(state) {
  const d = defaultState();
  const strip = (s) => JSON.stringify(s, (k, v) => (['font', 'emblem', 'mode', 'language', 'secondLanguage', 'emergency', 'qr', 'version', 'format', 'theme', 'showDate'].includes(k) ? undefined : v));
  return strip(state) === strip(d);
}

export function createStore(storage = globalThis.localStorage) {
  let state = load();
  const listeners = new Set();

  function load() {
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw) return migrate(JSON.parse(raw));
    } catch (err) {
      console.warn('Stored card could not be read, starting fresh', err);
    }
    return defaultState();
  }

  function save() {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Could not save', err);
    }
  }

  function notify(meta) {
    for (const fn of listeners) fn(state, meta);
  }

  return {
    get: () => state,
    /** Mutate in place through `fn(state)`. `meta.structural` means lists changed shape. */
    update(fn, meta = {}) {
      fn(state);
      save();
      notify(meta);
    },
    setValue(path, value) {
      this.update((s) => setPath(s, path, value), { path });
    },
    replace(next) {
      state = next;
      save();
      notify({ structural: true, replaced: true });
    },
    reset() {
      this.replace(defaultState());
      try {
        storage?.removeItem(STORAGE_KEY);
      } catch {}
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

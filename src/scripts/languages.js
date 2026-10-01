/**
 * The card languages, from src/data/languages.json, with their strings.
 * Vite bundles every strings file under i18n/card at build time. A language
 * with no strings file prints its card labels in English.
 */
import languagesData from '../data/languages.json';

const files = import.meta.glob('../data/i18n/card/*.json', { eager: true, import: 'default' });

export const LANGUAGES = languagesData.languages;

export const cardStrings = Object.fromEntries(
  LANGUAGES.map((l) => [l.id, files[`../data/i18n/card/${l.id}.json`]]).filter(([, v]) => v),
);

export function hasCardStrings(id) {
  return Boolean(cardStrings[id]);
}

/** True when a native speaker has checked the language's card headings. */
export function isReviewed(id) {
  return Boolean(cardStrings[id]?._reviewed);
}

export function languageName(id) {
  const l = LANGUAGES.find((x) => x.id === id);
  return l ? l.native : id;
}

import { createStore, requestPersistence } from './store.js';
import { initForm } from './form.js';
import { initMenus } from './dropdown.js';
import { initTips } from './tips.js';
import { initIcon } from './icon.js';
import { initPreview } from './preview.js';
import { initExports } from './exports.js';
import { loadShaper, scriptsFor, fallbackWouldHelp } from './fonts.js';
import { initCustomFont, getCustomFont, clearCustomFont } from './customfont.js';
import { cardStrings } from './languages.js';
import numbers from '../data/emergency-numbers.json';

const THEME_KEY = 'medical-card:theme';

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const toggle = document.querySelector('#theme-toggle');
  // The icon and label name the mode the button switches to, a moon in light mode and a sun in dark mode.
  const apply = (dark) => {
    document.documentElement.classList.toggle('dark', dark);
    toggle?.setAttribute('aria-label', dark ? toggle.dataset.labelLight : toggle.dataset.labelDark);
  };
  apply(stored ? stored === 'dark' : prefersDark);
  toggle?.addEventListener('click', () => {
    const dark = !document.documentElement.classList.contains('dark');
    apply(dark);
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  });
}

async function main() {
  initTheme();
  requestPersistence();
  const store = createStore();
  // One binding for the form and the card settings, so a change in either redraws both.
  const page = document.querySelector('main');
  initForm(store, page);
  initMenus(page);
  initTips(document);
  initIcon(store, document.querySelector('#card-form'));

  const status = document.querySelector('#preview-status');
  try {
    const { CHANGED } = initCustomFont(store, page);
    let withFallback = false;
    const shaper = await loadShaper(store.get().font, await getCustomFont(), scriptsFor(store.get()));
    const preview = initPreview(store, { shaper, strings: cardStrings, numbers }, document);
    initExports(store, preview, document);

    // A font change fetches the family once and redraws. A new custom font does the same.
    async function reloadFont() {
      try {
        preview.setShaper(await loadShaper(store.get().font, await getCustomFont(), scriptsFor(store.get()), withFallback));
      } catch (err) {
        console.error(err);
        status.textContent = `The card cannot be drawn: ${err.message}`;
        status.hidden = false;
      }
    }
    // A change of typeface or of the card's languages loads what is missing and redraws.
    let signature = `${store.get().font}|${scriptsFor(store.get()).join(',')}`;
    store.subscribe((state) => {
      const next = `${state.font}|${scriptsFor(state).join(',')}`;
      if (next === signature) return;
      signature = next;
      reloadFont();
    });
    document.addEventListener(CHANGED, reloadFont);
    page.addEventListener('card-cleared', async () => {
      await clearCustomFont();
      reloadFont();
    });
    // The first time a character is missing that Noto Sans could fill, load it and redraw.
    preview.onRender((result) => {
      if (withFallback || !fallbackWouldHelp({ ...result.missing, ...result.phone?.missing })) return;
      withFallback = true;
      reloadFont();
    });
  } catch (err) {
    console.error(err);
    status.textContent = `The card cannot be drawn: ${err.message}`;
    status.className = 'alert-box alert-danger';
  }
}

main();

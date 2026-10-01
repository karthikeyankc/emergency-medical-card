/**
 * Live preview. Re-renders the card after each change and reports fill,
 * overflow, and missing glyphs.
 */
import { renderCard } from '../card/render.js';
import ui from '../data/i18n/ui/en.json';
import example from '../data/example-card.json';
import { migrate, phoneState } from '../card/state.js';
import { calloutHtml } from './callout.js';
import { fieldName } from './fields.js';

const DEBOUNCE_MS = 60;

export function initPreview(store, initialCtx, root) {
  let ctx = initialCtx;
  const front = root.querySelector('#preview-front');
  const back = root.querySelector('#preview-back');
  const status = root.querySelector('#preview-status');
  const messages = root.querySelector('#messages');
  const listeners = new Set();
  let latest = null;
  let timer = null;
  let showingExample = false;
  const phone = root.querySelector('#preview-phone');
  const viewPhone = root.querySelector('#view-phone-wrap');
  const viewCardWrap = root.querySelector('#view-card-wrap');
  const viewListeners = new Set();
  const exampleState = migrate(structuredClone(example));


  function render() {
    const t0 = performance.now();
    const state = showingExample ? { ...exampleState, theme: store.get().theme, font: store.get().font } : store.get();
    const watermark = showingExample ? ui.exampleWatermark : null;
    latest = renderCard(state, { ...ctx, preview: true, watermark });
    latest.example = showingExample;
    front.innerHTML = latest.sides.front.svg;
    back.innerHTML = latest.sides.back.svg;
    if (phone && !viewPhone.hidden) {
      latest.phone = renderCard(phoneState(state), { ...ctx, preview: true, watermark });
      phone.innerHTML = latest.phone.sides.screen.svg;
    }
    for (const side of ['front', 'back']) {
      const fill = latest.sides[side].fill;
      const gauge = root.querySelector(`[data-gauge="${side}"]`);
      gauge.dataset.over = String(fill > 1);
      gauge.firstElementChild.style.width = `${Math.min(100, fill * 100).toFixed(0)}%`;
      root.querySelector(`[data-fill="${side}"]`).textContent = `${Math.round(fill * 100)}%`;
    }
    status.hidden = true;
    renderMessages();
    for (const fn of listeners) fn(latest);
    if (import.meta.env.DEV) console.debug(`render ${(performance.now() - t0).toFixed(1)} ms`);
  }

  function renderMessages() {
    const parts = [];
    // In the phone view the messages describe the phone image.
    const shown = latest.phone ?? latest;
    if (shown.overflow.length) {
      parts.push(calloutHtml('warning', `<p>${latest.phone ? ui.overflowHelpPhone : ui.overflowHelp}</p><ul>${shown.overflow.map((id) => `<li>${fieldName(id)}</li>`).join('')}</ul>`, ui.overflowHeading));
    }
    const missing = Object.entries(shown.missing);
    if (missing.length) {
      parts.push(calloutHtml('danger', `<ul>${missing.map(([id, chars]) => `<li>${fieldName(id)}: ${chars.map((c) => `<code>${c}</code>`).join(' ')}</li>`).join('')}</ul>`, ui.missingHeading));
    }
    messages.innerHTML = parts.join('');
  }

  store.subscribe(() => {
    clearTimeout(timer);
    timer = setTimeout(render, DEBOUNCE_MS);
  });
  render();

  // Tabs: the person's card, or the example, without touching their data.
  const tabCard = root.querySelector('#tab-card');
  const tabExample = root.querySelector('#tab-example');
  function selectTab(example) {
    showingExample = example;
    tabCard?.setAttribute('aria-selected', String(!example));
    tabExample?.setAttribute('aria-selected', String(example));
    render();
  }
  tabCard?.addEventListener('click', () => selectTab(false));
  tabExample?.addEventListener('click', () => selectTab(true));

  // Card or phone. The phone view shows the lock screen image, with a tip on using it.
  const btnCard = root.querySelector('#view-card');
  const btnPhone = root.querySelector('#view-phone');
  const phoneTip = root.querySelector('#phone-tip');
  function selectView(phoneView) {
    btnCard?.setAttribute('aria-pressed', String(!phoneView));
    btnPhone?.setAttribute('aria-pressed', String(phoneView));
    viewPhone.hidden = !phoneView;
    viewCardWrap.hidden = phoneView;
    if (phoneTip) phoneTip.hidden = !phoneView;
    render();
    for (const fn of viewListeners) fn(phoneView ? 'phone' : 'card');
  }
  btnCard?.addEventListener('click', () => selectView(false));
  btnPhone?.addEventListener('click', () => selectView(true));


  return {
    latest: () => latest,
    /** 'card' or 'phone', whichever the preview shows. */
    view: () => (viewPhone && !viewPhone.hidden ? 'phone' : 'card'),
    /** Subscribe to view changes. */
    onView(fn) {
      viewListeners.add(fn);
    },
    /** Swap the shaper after a font change and redraw. */
    setShaper(shaper) {
      ctx = { ...ctx, shaper };
      render();
    },
    /** Subscribe to renders. Fires at once with the latest result, so late subscribers are not left behind. */
    onRender: (fn) => {
      listeners.add(fn);
      if (latest) fn(latest);
    },
    /** Export-mode render of the current state. */
    forExport: () => renderCard(store.get(), { ...ctx, preview: false }),
    /** The lock screen image for the current card, at export quality. */
    forPhone: () => renderCard(phoneState(store.get()), { ...ctx, preview: false }),
  };
}

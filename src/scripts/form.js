/**
 * Bind the form to the store. Inputs carry `data-bind="path"`. Lists carry
 * `data-list="name"` with a <template> whose paths use `{i}`. Second-language
 * inputs pair with a `data-same` checkbox that stores null for "same as
 * English".
 */
import { getPath } from './store.js';
import { localised } from '../card/state.js';
import { languageName, hasCardStrings, isReviewed } from './languages.js';
import ui from '../data/i18n/ui/en.json';
import catalogue from '../data/conditions.json';
import { mecardFor, capacity, normalisePhone, MODULE_MIN } from '../card/qr.js';
import { cardStrings } from './languages.js';
import numbers from '../data/emergency-numbers.json';
import phoneFormats from '../data/phone-formats.json';
import { fillCallout } from './callout.js';

/** Match a typed condition name against catalogue names and aliases. */
function findCondition(text, lang = 'en') {
  const needle = text.trim().toLocaleLowerCase(lang);
  if (!needle) return null;
  return (
    catalogue.conditions.find(
      (c) => c.name[lang]?.toLocaleLowerCase(lang) === needle || c.aliases[lang]?.some((a) => a.toLocaleLowerCase(lang) === needle),
    ) ?? null
  );
}

/** The shape of a local phone number in a country, as a placeholder with no real digits, like xxxxx xxxxx. */
export function phoneExample(country) {
  return phoneFormats[country]?.local ?? 'xxxx xxxx';
}

const LIST_DEFAULTS = {
  medications: () => ({ name: localised(), dose: '', frequency: localised() }),
  contacts: () => ({ name: localised(), relationship: localised(), phone: '' }),
};

export function initForm(store, root) {
  function renderLists() {
    for (const list of root.querySelectorAll('[data-list]')) {
      const name = list.dataset.list;
      const template = list.querySelector('template');
      for (const row of list.querySelectorAll('[data-row]')) row.remove();
      const items = getPath(store.get(), name) ?? [];
      items.forEach((_, i) => {
        const html = template.innerHTML.replaceAll('{i}', String(i));
        const frag = document.createRange().createContextualFragment(html);
        const row = frag.querySelector('[data-row]');
        row.dataset.index = String(i);
        row.querySelector('[data-remove]')?.addEventListener('click', () => {
          store.update((s) => getPath(s, name).splice(i, 1), { structural: true });
        });
        list.appendChild(row);
      });
    }
  }

  /**
   * Second-language inputs are bound to whichever language is chosen.
   * Templates carry `data-bind-second="path"` and `data-same-second="path"`,
   * rewritten here to `path.<lang>` before hydration.
   */
  function bindSecondLanguage(state) {
    const lang = state.secondLanguage;
    for (const el of root.querySelectorAll('[data-bind-second]')) {
      el.dataset.bind = `${el.dataset.bindSecond}.${lang}`;
      el.setAttribute('lang', lang);
    }
    for (const el of root.querySelectorAll('[data-same-second]')) el.dataset.same = `${el.dataset.sameSecond}.${lang}`;
  }

  function hydrate() {
    const state = store.get();
    bindSecondLanguage(state);
    for (const el of root.querySelectorAll('[data-bind]')) {
      const value = getPath(state, el.dataset.bind);
      if (el.type === 'checkbox') el.checked = Boolean(value);
      else if (el.type === 'radio') el.checked = el.value === value;
      else el.value = value ?? '';
    }
    for (const box of root.querySelectorAll('[data-same]')) {
      const same = getPath(state, box.dataset.same) == null;
      box.checked = same;
      const input = root.querySelector(`[data-bind="${box.dataset.same}"]`);
      if (input) input.closest('label, div').hidden = same, (input.hidden = same);
      const label = root.querySelector(`label[for="${input?.id}"]`);
      if (label) label.hidden = same;
    }
    const bilingual = state.mode === 'bilingual';
    for (const el of root.querySelectorAll('[data-second-language]')) el.hidden = !bilingual;
    for (const el of root.querySelectorAll('[data-second-label]')) el.textContent = languageName(state.secondLanguage);
    for (const el of root.querySelectorAll('[data-first-label]')) el.textContent = ui.fields.sameAsFirst.replace('{language}', languageName(state.language));
    const languageNote = root.querySelector('#language-note');
    if (languageNote) {
      const chosen = [state.language, bilingual ? state.secondLanguage : null].filter(Boolean);
      const missing = chosen.filter((id) => !hasCardStrings(id));
      const unreviewed = chosen.filter((id) => hasCardStrings(id) && !isReviewed(id));
      const notes = [];
      if (missing.length) notes.push(ui.fields.labelsFallback.replace('{languages}', missing.map(languageName).join(', ')));
      if (unreviewed.length) notes.push(ui.fields.labelsUnreviewed.replace('{languages}', unreviewed.map(languageName).join(', ')));
      if (notes.length) fillCallout(languageNote, 'info', notes.map((n) => `<p>${n}</p>`).join(''));
      languageNote.hidden = !notes.length;
    }
    // Phone placeholders and their errors show the country's number shape, so the format is the one the person knows.
    const example = phoneExample(state.emergency.country);
    for (const el of root.querySelectorAll('[data-phone]')) el.placeholder = example;
    for (const el of root.querySelectorAll('[data-phone-error]')) el.textContent = ui.fields.phoneInvalid.replace('{example}', example);
    const calling = phoneFormats[state.emergency.country]?.calling ?? '+';
    for (const el of root.querySelectorAll('[data-phone-help]')) el.textContent = ui.fields.phoneAbroad.replace('{calling}', calling);
    // The second-language menu stands for both settings. Empty means one language.
    const second = root.querySelector('#second-language');
    if (second) second.value = state.mode === 'bilingual' ? state.secondLanguage : '';
    const note = root.querySelector('#country-note');
    if (note) {
      const entry = numbers[state.emergency.country];
      const date = entry ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(entry.lastVerified)) : '';
      const text = entry ? ui.fields.countryKnown.replace('{date}', date) : ui.fields.countryUnknown;
      note.dataset.tip = text;
      note.setAttribute('aria-label', text);
    }
  }

  /** Checks a person can fix while typing. Empty is fine here, the download callout asks for required fields. */
  const CHECKS = [
    [/^contacts\.\d+\.phone$/, (v) => !v.trim() || normalisePhone(v).replace('+', '').length >= 6],
    [/^person\.birthYear$/, (v) => !v.trim() || (/^\d{4}$/.test(v) && Number(v) >= 1900 && Number(v) <= new Date().getFullYear())],
  ];
  function showCheck(el) {
    const check = CHECKS.find(([re]) => re.test(el.dataset.bind));
    if (!check) return;
    const ok = check[1](el.value);
    el.setAttribute('aria-invalid', String(!ok));
    const error = root.querySelector(`[data-error-for="${el.dataset.bind}"]`);
    if (error) error.hidden = ok;
  }
  // Checked when the person leaves the field, so an error never appears mid-typing.
  root.addEventListener('focusout', (e) => {
    if (e.target.dataset?.bind) showCheck(e.target);
  });

  root.querySelector('#second-language')?.addEventListener('change', (e) => {
    const lang = e.target.value;
    store.update((s) => {
      s.mode = lang ? 'bilingual' : 'single';
      if (lang) s.secondLanguage = lang;
    });
    hydrate();
  });


  root.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.dataset?.bind) return;
    if (el.getAttribute('aria-invalid') === 'true') showCheck(el);
    let value = el.value;
    if (el.type === 'checkbox') value = el.checked;
    if (el.dataset.type === 'number') value = Number(value);
    store.setValue(el.dataset.bind, value);
    if (el.dataset.bind === 'conditions.0.name.en') linkCondition(value);
  });

  /**
   * A typed name that matches the catalogue links the condition to its id
   * and fills the second-language name when the user has not typed one.
   */
  function linkCondition(text) {
    const match = findCondition(text);
    store.update((s) => {
      const c = s.conditions[0];
      c.id = match?.id ?? null;
      if (match) {
        c.name.en = match.name.en;
        for (const lang of catalogue.languages) {
          if (lang !== 'en' && match.name[lang] && (c.name[lang] == null || c.catalogueName)) {
            c.name[lang] = match.name[lang];
            c.catalogueName = true;
          }
        }
      } else if (c.catalogueName) {
        for (const lang of catalogue.languages) if (lang !== 'en') c.name[lang] = null;
        delete c.catalogueName;
      }
      applyPrefill(s, match);
    });
    hydrate();
    renderPrefillNote(store.get());
  }

  /**
   * Suggested DO and DO NOT from the catalogue. Applied only to fields the
   * user has not written in, or that still hold the previous suggestion.
   * Switching to a condition without a suggestion clears an untouched one.
   */
  function applyPrefill(s, match) {
    const current = s.prefill;
    const untouched = (field) => !s[field].en.trim() || (current && s[field].en === current[field]);
    const p = match?.prefill;
    if (p) {
      const doText = (p.do?.en ?? []).join('\n');
      const doNotText = (p.doNot?.en ?? []).join('\n');
      if (untouched('do')) s.do.en = doText;
      if (untouched('doNot')) s.doNot.en = doNotText;
      s.prefill = { id: match.id, do: doText, doNot: doNotText };
    } else if (current) {
      if (untouched('do')) s.do.en = '';
      if (untouched('doNot')) s.doNot.en = '';
      s.prefill = null;
    }
  }

  /** The citation under the instructions, and the warning once the text is edited. */
  function renderPrefillNote(state) {
    const note = root.querySelector('#prefill-note');
    const edited = root.querySelector('#prefill-edited');
    if (!note) return;
    const p = state.prefill;
    const condition = p && catalogue.conditions.find((c) => c.id === p.id);
    if (!p || !condition?.prefill) {
      note.hidden = true;
      edited.hidden = true;
      return;
    }
    const sources = condition.prefill.sources
      .map((src) => `<a class="underline" href="${src.url}" target="_blank" rel="noopener noreferrer">${src.org}, ${src.title}</a>`)
      .join(' and ');
    fillCallout(note, 'info', `<p>${ui.fields.prefillNote.replace('{condition}', condition.name.en).replace('{sources}', sources).replace('{review}', condition.reviewedBy ?? '')}</p>`);
    edited.hidden = state.do.en === p.do && state.doNot.en === p.doNot;
  }

  root.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset?.same) {
      store.setValue(el.dataset.same, el.checked ? null : '');
      hydrate();
      if (!el.checked) root.querySelector(`[data-bind="${el.dataset.same}"]`)?.focus();
      return;
    }
    if (el.dataset?.bind === 'emergency.country') {
      const entry = numbers[el.value];
      store.update((s) => {
        s.emergency.general = entry?.general ?? '';
        s.emergency.ambulance = entry?.ambulance ?? '';
      });
      hydrate();
    }
    if (['mode', 'language', 'secondLanguage'].includes(el.dataset?.bind)) hydrate();
  });

  root.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (!add) return;
    const name = add.dataset.add;
    store.update((s) => getPath(s, name).push(LIST_DEFAULTS[name]()), { structural: true });
    const rows = root.querySelectorAll(`[data-list="${name}"] [data-row]`);
    rows[rows.length - 1]?.querySelector('input, textarea')?.focus();
  });

  /** Live budget for the QR code: bytes, modules, module size, and whether a phone will read it. */
  function renderQrMeter(state) {
    const meter = root.querySelector('#qr-meter');
    const gauge = root.querySelector('#qr-gauge');
    const options = root.querySelector('#qr-options');
    if (!meter) return;
    options.hidden = !state.qr?.on;
    if (!state.qr?.on) return;
    const text = mecardFor(state, cardStrings.en);
    if (!text) {
      meter.textContent = ui.fields.qrNoNumbers;
      gauge.dataset.verdict = 'dense';
      gauge.firstElementChild.style.width = '0%';
      return;
    }
    const c = capacity(text, state.qr.size);
    const used = Math.min(100, Math.round((MODULE_MIN / c.moduleMm) * 100));
    gauge.dataset.verdict = c.verdict;
    gauge.firstElementChild.style.width = `${used}%`;
    const verdict = { easy: ui.fields.qrEasy, close: ui.fields.qrClose, dense: ui.fields.qrDense }[c.verdict];
    meter.textContent = ui.fields.qrMeterText.replace('{bytes}', c.bytes).replace('{modules}', c.modules).replace('{mm}', c.moduleMm.toFixed(2)) + ' ' + verdict;
  }

  store.subscribe((state, meta) => {
    if (meta.structural || (meta.path ?? '').startsWith('qr') || (meta.path ?? '').startsWith('person') || (meta.path ?? '').startsWith('contacts') || (meta.path ?? '').startsWith('conditions') || (meta.path ?? '').startsWith('hospital')) renderQrMeter(state);
    if (meta.structural) {
      renderLists();
      hydrate();
    }
    if (meta.structural || meta.path === 'do.en' || meta.path === 'doNot.en') renderPrefillNote(state);
  });

  // A fresh or cleared card shows its country's numbers straight away, not only after a change.
  function fillCountryNumbers() {
    const current = store.get();
    const entry = numbers[current.emergency.country];
    if (entry && !current.emergency.general) {
      store.update((s) => {
        s.emergency.general = entry.general;
        s.emergency.ambulance = entry.ambulance ?? '';
      });
      hydrate();
    }
  }
  store.subscribe((_, meta) => {
    if (meta.replaced) fillCountryNumbers();
  });
  fillCountryNumbers();

  renderLists();
  hydrate();
  renderPrefillNote(store.get());
  renderQrMeter(store.get());
}

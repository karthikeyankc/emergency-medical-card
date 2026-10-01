/**
 * The same callout as Callout.astro, for content built by scripts.
 * Icons are Lucide, inlined so no lookup is needed at run time.
 */
const ICONS = {
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  success: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  danger: '<path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z"/><path d="M12 16h.01"/><path d="M12 8v4"/>',
};

/** @param {'info'|'warning'|'success'|'danger'} kind @param {string} html body markup, already safe */
export function calloutHtml(kind, html, title) {
  const role = kind === 'danger' ? ' role="alert"' : '';
  return (
    `<div class="callout callout-${kind}"${role}>` +
    `<svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[kind]}</svg>` +
    `<div class="callout-body">${title ? `<p class="callout-title">${title}</p>` : ''}${html}</div></div>`
  );
}

/** Turn an existing element into a callout of `kind` with `html` inside, and show it. */
export function fillCallout(el, kind, html, title) {
  el.className = `callout callout-${kind}`;
  el.innerHTML =
    `<svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[kind]}</svg>` +
    `<div class="callout-body">${title ? `<p class="callout-title">${title}</p>` : ''}${html}</div>`;
  el.hidden = false;
}

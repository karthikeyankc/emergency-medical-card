/**
 * The preview's actions. Download opens a menu of every format, and Save,
 * Open, and Clear handle the copy of the card.
 */
import { saveBlob, fileName } from '../export/download.js';
import { svgBlob } from '../export/svg.js';
import { svgToPng, svgToPngPixels } from '../export/png.js';
import { stateBlob, readStateFile } from '../export/json.js';
import { printSheet } from '../export/sheet.js';
import ui from '../data/i18n/ui/en.json';
import paper from '../data/paper.json';
import { fillCallout } from './callout.js';
import { isBlank } from './store.js';
import { fieldName, focusField } from './fields.js';
import { dropdown } from './dropdown.js';

/** Lucide chevron-right, marking a drawer row as something to tap. */
const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function initExports(store, preview, root) {
  const $ = (s) => root.querySelector(s);
  const trigger = $('#download');
  const menu = $('#download-menu');
  const phoneItem = $('#dl-phone');
  const note = $('#export-note');
  const sheetLabel = $('[data-sheet-label]');

  const paperFor = (state) => (paper.letter.includes(state.emergency.country) ? 'letter' : 'a4');
  const personName = () => store.get().person.name?.en;

  function updateSheetLabel(state) {
    sheetLabel.textContent = ui.sheet.replace('{paper}', paperFor(state) === 'letter' ? 'Letter' : 'A4');
  }
  store.subscribe(updateSheetLabel);
  updateSheetLabel(store.get());

  // Download stays focusable when it can't be used, so its tooltip can say why.
  // aria-disabled blocks the menu, and pressing it goes to the first missing field.
  const why = $('#download-why');
  const drawer = $('#download-why-dialog');
  const drawerBody = $('#download-why-body');
  let blocked = { reason: null, fields: [] };
  let menuControl = null;

  function reasonHtml(asButtons) {
    if (blocked.reason !== 'incomplete') return `<p>${escape(blocked.reason === 'example' ? ui.exampleBlocked : ui.cardBlocked)}</p>`;
    const items = blocked.fields.map((id) => (asButtons ? `<li><button type="button" class="dropdown-item" data-field="${id}">${escape(fieldName(id))}${CHEVRON}</button></li>` : `<li>${escape(fieldName(id))}</li>`));
    return `<p>${escape(ui.incompleteHelp)}</p><ul class="${asButtons ? 'drawer-list mt-2' : 'tooltip-list'}">${items.join('')}</ul>`;
  }

  function enable(result) {
    const reason = result.example ? 'example' : result.incomplete.length ? 'incomplete' : !result.ok ? 'card' : null;
    blocked = { reason, fields: result.incomplete };
    trigger.setAttribute('aria-disabled', String(Boolean(reason)));
    why.innerHTML = reason ? `<p class="font-semibold">${escape(ui.incompleteHeading)}</p>${reasonHtml(false)}` : '';
    if (reason) menuControl?.close();
    // The lock screen holds a little less than the card, so it can be full when the card is not.
    phoneItem.disabled = Boolean(result.phone && !result.phone.ok);
  }
  preview.onRender(enable);

  function explain() {
    // A touch screen has no hover, so the reasons open in a drawer from the bottom.
    if (matchMedia('(hover: none)').matches) {
      drawerBody.innerHTML = reasonHtml(true);
      drawer.showModal();
    } else if (blocked.reason === 'incomplete') focusField(blocked.fields[0]);
  }
  menuControl = dropdown(trigger, menu, { blocked: () => Boolean(blocked.reason), onBlocked: explain });
  drawer.addEventListener('click', (e) => {
    const field = e.target.closest('[data-field]')?.dataset.field;
    if (field || e.target.closest('[data-close]') || e.target === drawer) {
      drawer.close();
      if (field) focusField(field);
    }
  });

  function report(kind, html) {
    fillCallout(note, kind, html);
    note.hidden = false;
  }

  function action(item, fn) {
    item.addEventListener('click', async () => {
      menuControl.close(true);
      note.hidden = true;
      trigger.setAttribute('aria-disabled', 'true');
      try {
        await fn();
      } catch (err) {
        console.error(err);
        report('danger', `<p>${escape(ui.exportFailed.replace('{message}', err.message))}</p>`);
      } finally {
        enable(preview.latest());
      }
    });
  }

  action($('#dl-pdf'), async () => {
    const { svgsToPdf } = await import('../export/pdf.js');
    const r = preview.forExport();
    const blob = await svgsToPdf(r.format.sides.map((s) => r.sides[s].svg), r.format.width, r.format.height);
    saveBlob(blob, fileName('pdf', null, undefined, personName()));
  });

  action($('#dl-sheet'), async () => {
    const { svgsToPdf } = await import('../export/pdf.js');
    const r = preview.forExport();
    const [front, back] = r.format.sides.map((s) => r.sides[s].svg);
    const sheet = printSheet(front, back, r.format, paperFor(store.get()));
    saveBlob(await svgsToPdf([sheet.svg], sheet.width, sheet.height), fileName('pdf', 'print-at-home', undefined, personName()));
    report('success', `<p>${escape(ui.sheetDone)}</p>`);
  });

  action(phoneItem, async () => {
    const p = preview.forPhone();
    // The phone image holds a little less than the card. In the card view it has not been drawn, so check here.
    if (!p.ok) {
      report('warning', `<p>${escape(ui.phoneFull)}</p><ul>${p.overflow.map((id) => `<li>${escape(fieldName(id))}</li>`).join('')}</ul>`);
      return;
    }
    saveBlob(await svgToPngPixels(p.sides.screen.svg, p.format.width, p.format.height), fileName('png', 'lock-screen', undefined, personName()));
  });

  for (const item of [$('#dl-png'), $('#dl-png-300')]) {
    action(item, async () => {
      const r = preview.forExport();
      for (const side of r.format.sides) {
        saveBlob(await svgToPng(r.sides[side].svg, r.format.width, r.format.height, Number(item.dataset.dpi)), fileName('png', side, undefined, personName()));
      }
    });
  }

  action($('#dl-svg'), async () => {
    const r = preview.forExport();
    for (const side of r.format.sides) saveBlob(svgBlob(r.sides[side].svg), fileName('svg', side, undefined, personName()));
  });

  $('#save-json').addEventListener('click', () => {
    const state = store.get();
    saveBlob(stateBlob(state), fileName('json', null, undefined, state.person.name?.en));
  });

  $('#open-json').addEventListener('click', () => $('#load-json').click());
  $('#load-json').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    note.hidden = true;
    try {
      store.replace(await readStateFile(file));
    } catch (err) {
      report('danger', `<p>${escape(ui.loadFailed.replace('{message}', err.message))}</p>`);
    }
    e.target.value = '';
  });

  // Clearing asks first, in the page, and says what cannot be undone.
  const confirmBox = $('#clear-confirm');
  $('#clear').addEventListener('click', () => {
    confirmBox.hidden = false;
    $('#clear-no').focus();
  });
  $('#clear-no').addEventListener('click', () => {
    confirmBox.hidden = true;
    $('#menu-file').focus();
  });
  $('#clear-yes').addEventListener('click', async () => {
    confirmBox.hidden = true;
    store.reset();
    root.dispatchEvent(new CustomEvent('card-cleared'));
  });

  // Once there is something worth keeping, the status line asks for a copy.
  const status = $('#backup-text');
  const nudge = (state) => { status.textContent = isBlank(state) ? ui.savedHere : ui.backupNudge; };
  store.subscribe(nudge);
  nudge(store.get());
}

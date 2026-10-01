/**
 * A font from the user's own computer, for the card's Latin text. Picked
 * as a file in any browser, or from the installed fonts where the browser
 * offers that (Chromium's queryLocalFonts). Kept in IndexedDB so it
 * survives a reload. It never leaves the device.
 */
import ui from '../data/i18n/ui/en.json';
import { fillCallout } from './callout.js';

const DB = 'medical-card';
const STORE = 'fonts';
const KEY = 'custom';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

export const getCustomFont = () => tx('readonly', (s) => s.get(KEY)).catch(() => null);
const setCustomFont = (record) => tx('readwrite', (s) => s.put(record, KEY));
/** Clearing the card removes the font too, so a shared computer keeps nothing. */
export const clearCustomFont = () => tx('readwrite', (s) => s.delete(KEY)).catch(() => null);

const CHANGED = 'customfont-changed';

/** Build the stored record from one or two font files. */
async function recordFromBuffers(regularData, boldData) {
  const { inspectFontFile, pickFaces } = await import('../card/text/fontfile.js');
  const regInfo = inspectFontFile(regularData);
  const picked = pickFaces(regInfo.faces);
  const record = {
    name: `${picked.regular.family} ${picked.regular.style}`.trim(),
    regular: { data: regularData, faceIndex: picked.regular.index, variable: picked.regular.variable },
    bold: picked.viaAxis || !picked.boldSynthetic ? { data: regularData, faceIndex: picked.bold.index, variable: picked.bold.variable } : null,
  };
  if (boldData) {
    const boldInfo = inspectFontFile(boldData);
    const b = boldInfo.faces.find((f) => /^bold$/i.test(f.style)) ?? boldInfo.faces[0];
    record.bold = { data: boldData, faceIndex: b.index, variable: b.variable };
  }
  return record;
}

export function initCustomFont(store, root) {
  const panel = root.querySelector('#font-custom');
  const regular = root.querySelector('#font-file-regular');
  const bold = root.querySelector('#font-file-bold');
  const local = root.querySelector('#font-local');
  const status = root.querySelector('#font-status');
  const error = root.querySelector('#font-error');

  const show = (msg, isError = false) => {
    if (isError) fillCallout(error, 'danger', `<p>${msg}</p>`);
    else status.textContent = msg;
    error.hidden = !isError;
    status.hidden = isError;
  };

  async function describe() {
    const rec = await getCustomFont();
    if (!rec) return show(ui.fields.fontCustomNone);
    show(rec.bold ? ui.fields.fontCustomLoaded.replace('{name}', rec.name) : ui.fields.fontCustomNoBold.replace('{name}', rec.name));
  }

  async function save(regularData, boldData) {
    try {
      const record = await recordFromBuffers(regularData, boldData);
      await setCustomFont(record);
      await describe();
      document.dispatchEvent(new CustomEvent(CHANGED));
    } catch (err) {
      show(err.message, true);
    }
  }

  regular.addEventListener('change', async () => {
    const file = regular.files?.[0];
    if (!file) return;
    await save(await file.arrayBuffer(), bold.files?.[0] ? await bold.files[0].arrayBuffer() : null);
    regular.value = '';
  });
  bold.addEventListener('change', async () => {
    const file = bold.files?.[0];
    const rec = await getCustomFont();
    if (!file || !rec) return show(ui.fields.fontCustomRegularFirst, true);
    await save(rec.regular.data, await file.arrayBuffer());
    bold.value = '';
  });

  if ('queryLocalFonts' in window) {
    local.hidden = false;
    local.addEventListener('click', async () => {
      try {
        const fonts = await window.queryLocalFonts();
        const families = [...new Set(fonts.map((f) => f.family))].sort((a, b) => a.localeCompare(b));
        const picker = root.querySelector('#font-local-list');
        picker.replaceChildren(new Option(ui.fields.fontLocalChoose, ''), ...families.map((f) => new Option(f, f)));
        picker.hidden = false;
        picker.onchange = async () => {
          const family = picker.value;
          if (!family) return;
          const ofFamily = fonts.filter((f) => f.family === family);
          const reg = ofFamily.find((f) => /^(regular|book|normal|roman)$/i.test(f.style)) ?? ofFamily[0];
          const bld = ofFamily.find((f) => /^bold$/i.test(f.style));
          const regData = await (await reg.blob()).arrayBuffer();
          const boldData = bld && bld !== reg ? await (await bld.blob()).arrayBuffer() : null;
          await save(regData, boldData);
        };
      } catch (err) {
        show(err.message, true);
      }
    });
  }

  store.subscribe((state) => {
    panel.hidden = state.font !== 'custom';
  });
  panel.hidden = store.get().font !== 'custom';
  describe();
  return { CHANGED };
}

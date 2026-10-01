/**
 * Uploaded condition icon. SVG is sanitised, PNG is checked for size,
 * both are stored as data URLs in state.
 */
import ui from '../data/i18n/ui/en.json';
import { genericIcon, inlineIconMarkup } from '../card/icons.js';
import symbols from '../data/symbols.json';
import { fillCallout } from './callout.js';
import { symbolIcon } from '../card/state.js';

const MIN_PX = 600;
const BLOCKED_TAGS = ['script', 'foreignObject', 'iframe', 'object', 'embed', 'audio', 'video', 'animate', 'set'];

function sanitiseSvg(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.nodeName !== 'svg') throw new Error('Not an SVG file');
  for (const tag of BLOCKED_TAGS) for (const el of [...doc.getElementsByTagName(tag)]) el.remove();
  for (const el of doc.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      else if ((name === 'href' || name === 'xlink:href') && !value.startsWith('#')) el.removeAttribute(attr.name);
      else if (/url\(\s*['"]?\s*(https?:|\/\/)/i.test(value)) el.removeAttribute(attr.name);
    }
  }
  // A picture inside an SVG has no size check and can print blurred.
  if (doc.getElementsByTagName('image').length) {
    throw new Error(`This SVG has a picture inside it, which can print blurred. Upload the picture as a PNG of at least ${MIN_PX} px, or use an SVG made only of shapes.`);
  }
  if (!svg.getAttribute('viewBox')) {
    const w = parseFloat(svg.getAttribute('width')) || 24;
    const h = parseFloat(svg.getAttribute('height')) || 24;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  return new XMLSerializer().serializeToString(svg);
}

function toDataUrl(mime, text) {
  return `data:${mime};base64,${btoa(unescape(encodeURIComponent(text)))}`;
}

async function pngDimensions(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Could not read the image'));
      i.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function iconFromFile(file) {
  if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
    const clean = sanitiseSvg(await file.text());
    return { kind: 'upload', mime: 'image/svg+xml', dataUrl: toDataUrl('image/svg+xml', clean) };
  }
  if (file.type === 'image/png') {
    const { width, height } = await pngDimensions(file);
    if (Math.min(width, height) < MIN_PX) throw new Error(`PNG must be at least ${MIN_PX} px on its short side. This one is ${width} × ${height}.`);
    const dataUrl = await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(file);
    });
    return { kind: 'upload', mime: 'image/png', dataUrl };
  }
  throw new Error('Use an SVG or PNG file');
}

export function initIcon(store, root) {
  const input = root.querySelector('#icon-file');
  const remove = root.querySelector('#icon-remove');
  const preview = root.querySelector('#icon-preview');
  const error = root.querySelector('#icon-error');

  const svgOf = (inner) => `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

  function render() {
    const icon = store.get().conditions[0]?.icon;
    if (icon?.kind === 'symbol') {
      preview.innerHTML = `<svg viewBox="${icon.viewBox}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${icon.markup}</svg>`;
      remove.hidden = false;
    } else if (icon?.kind === 'upload') {
      const img = new Image();
      img.alt = '';
      img.src = icon.dataUrl;
      preview.replaceChildren(img);
      remove.hidden = false;
    } else if (icon?.kind === 'lucide' && icon.node) {
      preview.innerHTML = svgOf(inlineIconMarkup(icon, 0, 0, 24, 'currentColor'));
      remove.hidden = false;
    } else {
      preview.innerHTML = svgOf(genericIcon(0, 0, 24, 'currentColor'));
      remove.hidden = true;
    }
  }

  // Picker over every Lucide icon. The list loads the first time it opens.
  const dialog = root.querySelector('#icon-picker');
  const open = root.querySelector('#icon-pick');
  const search = root.querySelector('#icon-search');
  const grid = root.querySelector('#icon-grid');
  let icons = null;
  const MEDICAL = ['stethoscope', 'heart-pulse', 'activity', 'pill', 'syringe', 'brain', 'droplet', 'ear', 'eye', 'bone', 'wind', 'thermometer', 'bandage', 'cross', 'hospital', 'ambulance', 'accessibility', 'wheelchair', 'baby', 'shield-alert', 'triangle-alert', 'heart', 'zap', 'bed', 'moon', 'sun', 'utensils', 'wheat-off', 'milk-off', 'nut-off', 'egg-off', 'fish-off', 'bug', 'flower', 'cigarette-off', 'pipette', 'microscope', 'dna', 'hand', 'footprints'];

  function show(list) {
    grid.innerHTML = list
      .slice(0, 96)
      .map((ic) => `<button type="button" class="icon-choice" data-name="${ic.name}" aria-label="${ic.name.replaceAll('-', ' ')}" title="${ic.name}">${svgOf(inlineIconMarkup(ic, 0, 0, 24, 'currentColor'))}</button>`)
      .join('');
    grid.dataset.count = String(list.length);
  }

  async function openPicker() {
    dialog.showModal();
    search.value = '';
    if (!icons) {
      grid.innerHTML = `<p class="help">${ui.loadingIcons}</p>`;
      icons = (await import('../data/lucide-icons.json')).default;
    }
    show(icons.filter((ic) => MEDICAL.includes(ic.name)).sort((a, b) => MEDICAL.indexOf(a.name) - MEDICAL.indexOf(b.name)));
    search.focus();
  }

  open?.addEventListener('click', openPicker);
  root.querySelector('#icon-picker-close')?.addEventListener('click', () => dialog.close());

  // Picker tabs and the Symbols grid
  const tabIcons = root.querySelector('#picker-tab-icons');
  const tabSymbols = root.querySelector('#picker-tab-symbols');
  const panelIcons = root.querySelector('#picker-icons');
  const panelSymbols = root.querySelector('#picker-symbols');
  function pickerTab(symbolsTab) {
    tabIcons.setAttribute('aria-selected', String(!symbolsTab));
    tabSymbols.setAttribute('aria-selected', String(symbolsTab));
    panelIcons.hidden = symbolsTab;
    panelSymbols.hidden = !symbolsTab;
  }
  tabIcons?.addEventListener('click', () => pickerTab(false));
  tabSymbols?.addEventListener('click', () => pickerTab(true));
  panelSymbols?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-symbol]');
    if (!btn) return;
    const sym = symbols.find((s) => s.id === btn.dataset.symbol);
    store.setValue('conditions.0.icon', symbolIcon(sym));
    dialog.close();
  });
  search?.addEventListener('input', () => {
    if (!icons) return;
    const q = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!q.length) return show(icons.filter((ic) => MEDICAL.includes(ic.name)));
    show(icons.filter((ic) => q.every((w) => ic.name.includes(w))));
  });
  grid?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-name]');
    if (!btn) return;
    const ic = icons.find((x) => x.name === btn.dataset.name);
    store.setValue('conditions.0.icon', { kind: 'lucide', name: ic.name, node: ic.node, box: ic.box });
    dialog.close();
  });

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    error.hidden = true;
    try {
      const icon = await iconFromFile(file);
      store.setValue('conditions.0.icon', icon);
    } catch (err) {
      fillCallout(error, 'danger', `<p>${err.message}</p>`);
    }
    input.value = '';
  });
  remove.addEventListener('click', () => store.setValue('conditions.0.icon', { kind: 'generic' }));
  store.subscribe(render);
  render();
}

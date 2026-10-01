/**
 * Browser smoke test against a running build (default http://127.0.0.1:4321).
 * Fills the form, checks the preview updates, downloads every format,
 * validates each file, and asserts that no request left the origin.
 *
 *   node scripts/smoke.mjs [url]
 */
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readPhys } from '../src/export/png.js';

const url = process.argv[2] ?? 'http://127.0.0.1:4321/';
const origin = new URL(url).origin;
const out = join(process.cwd(), '.fixtures-out', 'smoke');
mkdirSync(out, { recursive: true });

function findChromium() {
  const cache = join(homedir(), 'Library', 'Caches', 'ms-playwright');
  if (!existsSync(cache)) return null;
  const dir = readdirSync(cache).find((d) => d.startsWith('chromium-'));
  if (!dir) return null;
  for (const sub of ['', ...readdirSync(join(cache, dir))]) {
    const base = join(cache, dir, sub);
    if (!existsSync(base) || !statSync(base).isDirectory()) continue;
    const app = readdirSync(base).find((d) => d.endsWith('.app'));
    if (app) return join(base, app, 'Contents', 'MacOS', app.replace('.app', ''));
  }
  return null;
}

const executablePath = findChromium();
const browser = await chromium.launch(executablePath ? { executablePath } : { channel: 'chrome' });
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 1000 } });
const page = await context.newPage();

const foreign = [];
page.on('request', (r) => {
  if (!r.url().startsWith(origin) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) foreign.push(r.url());
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const fails = [];
const check = (cond, msg) => (cond ? console.log(`ok   ${msg}`) : (fails.push(msg), console.log(`FAIL ${msg}`)));
/** Open a menu in the bar above the card, unless it is open already. */
async function menu(id) {
  if ((await page.getAttribute(`#menu-${id}`, 'aria-expanded')) !== 'true') await page.click(`#menu-${id}`);
  await page.waitForTimeout(220);
}

await page.goto(url);
await page.waitForSelector('#preview-front svg', { timeout: 20000 });
check(true, 'preview renders after fonts load');
check((await page.getAttribute('#download', 'aria-disabled')) === 'true', 'a blank card cannot be downloaded');
check((await page.textContent('#download-why')).includes('Full name'), 'the Download tooltip lists what is missing');

await page.fill('[data-bind="person.name.en"]', 'Sara Kumar');
await page.fill('[data-bind="person.birthYear"]', '1958');
await page.fill('[data-bind="conditions.0.name.en"]', 'Type 1 Diabetes');
await page.fill('[data-bind="do.en"]', 'Give me sugar or juice.\nCall an ambulance if I cannot swallow.');
await page.fill('[data-bind="doNot.en"]', 'Give me insulin.');
await page.click('[data-add="medications"]');
await page.fill('[data-bind="medications.0.name.en"]', 'Insulin glargine');
await page.fill('[data-bind="medications.0.dose"]', '20 units');
await page.fill('[data-bind="contacts.0.name.en"]', 'Ravi Kumar');
await page.fill('[data-bind="contacts.0.phone"]', 'asdasdas');
await page.locator('[data-bind="contacts.0.phone"]').blur();
check(await page.isVisible('[data-error-for="contacts.0.phone"]'), 'a phone number with no digits is named as a problem');
await page.fill('[data-bind="contacts.0.phone"]', '+44 7700 900123');
check(!(await page.isVisible('[data-error-for="contacts.0.phone"]')), 'fixing the number clears the error');
await page.waitForTimeout(300);

const frontBefore = await page.innerHTML('#preview-front');
check(frontBefore.includes('<path d="M'), 'front preview contains outlined text');
check(!frontBefore.includes('<text'), 'preview has no live text');
const backBefore = await page.innerHTML('#preview-back');
check(backBefore.includes('id="body-back"') && !backBefore.includes('id="body-front"'), 'back side uses its own clip ids');
const backTop = await page.evaluate(() => {
  const el = document.querySelector('#preview-back svg path');
  const r = el?.getBoundingClientRect();
  const box = document.querySelector('#preview-back svg').getBoundingClientRect();
  return r ? (r.top - box.top) / box.height : 1;
});
check(backTop < 0.15, `back content starts near the top (${(backTop * 100).toFixed(0)}% down)`);

// Icon picker over the Lucide set
await page.click('#icon-pick');
await page.waitForSelector('#icon-grid [data-name]', { timeout: 15000 });
await page.fill('#icon-search', 'brain');
await page.waitForTimeout(150);
check((await page.locator('#icon-grid [data-name]').count()) > 0, 'icon search finds results');
await page.click('#icon-grid [data-name="brain"]');
await page.waitForTimeout(300);
check((await page.innerHTML('#icon-preview')).includes('<svg'), 'picked icon shows in the preview tile');
check(await page.evaluate(() => JSON.parse(localStorage.getItem('medical-card:v1')).conditions[0].icon.kind === 'lucide'), 'picked icon is stored as a Lucide icon');

// QR section and its live meter
await page.check('[data-bind="qr.on"]');
await page.waitForTimeout(200);
check((await page.textContent('#qr-meter')).includes('squares on each side'), `qr meter reports capacity (${(await page.textContent('#qr-meter')).trim()})`);
await page.check('[data-bind="qr.include.address"]');
await page.fill('[data-bind="person.address.en"]', 'Park House, Lake Road Part 2, Hillton Gardens, Riverside, North County, Kent');
await page.waitForTimeout(200);
check((await page.textContent('#qr-meter')).includes('cannot scan this reliably'), 'a long address at 14 mm is flagged as too dense');
await page.selectOption('[data-bind="qr.size"]', '18');
await page.waitForTimeout(200);
check(!(await page.textContent('#qr-meter')).includes('cannot scan this reliably'), 'going up to 18 mm brings it back');
await page.uncheck('[data-bind="qr.include.address"]');
await page.selectOption('[data-bind="qr.size"]', '14');
await page.uncheck('[data-bind="qr.on"]');
await page.click('#icon-remove');
await page.waitForTimeout(150);

// Prefill from the catalogue, its citation, and the warning once edited
await page.fill('[data-bind="conditions.0.name.en"]', '');
await page.fill('[data-bind="do.en"]', '');
await page.fill('[data-bind="doNot.en"]', '');
await page.fill('[data-bind="conditions.0.name.en"]', 'Epilepsy');
await page.waitForTimeout(200);
check((await page.inputValue('[data-bind="do.en"]')).includes('Cushion my head'), 'picking a catalogue condition prefills DO');
check((await page.inputValue('[data-bind="doNot.en"]')).includes('Hold me down'), 'and DO NOT');
check(await page.isVisible('#prefill-note') && (await page.textContent('#prefill-note')).includes('NHS'), 'the citation names its source');
check(!(await page.isVisible('#prefill-edited')), 'no edit warning while the text is untouched');
await page.fill('[data-bind="do.en"]', 'Something I wrote myself.');
await page.waitForTimeout(200);
check(await page.isVisible('#prefill-edited'), 'editing the suggestion shows the doctor warning');
await page.fill('[data-bind="conditions.0.name.en"]', 'Type 1 Diabetes');
await page.waitForTimeout(200);
check((await page.inputValue('[data-bind="do.en"]')) === 'Something I wrote myself.', 'switching condition keeps text the user wrote');
await page.fill('[data-bind="do.en"]', 'Give me sugar or juice.\nCall an ambulance if I cannot swallow.');
await page.fill('[data-bind="doNot.en"]', 'Give me insulin.');
await page.waitForTimeout(200);

// Bilingual mode with a Tamil name
await menu('language');
await page.selectOption('#second-language', 'ta');
await page.keyboard.press('Escape');
await page.waitForTimeout(100);
check(await page.isVisible('[data-bind="person.name.ta"]') === false, 'second-language input hidden while "same as English" is checked');
await page.uncheck('[data-same="person.name.ta"]');
await page.fill('[data-bind="person.name.ta"]', 'சாரா குமார்');
await page.waitForTimeout(300);
const back = await page.innerHTML('#preview-back');
check(back.length > 2000, 'back side renders in Tamil');
check(await page.locator('#messages .callout-danger').count() === 0, 'no missing-glyph warning for Tamil');

// Persistence
await page.reload();
await page.waitForSelector('#preview-front svg', { timeout: 20000 });
check((await page.inputValue('[data-bind="person.name.en"]')) === 'Sara Kumar', 'state survives a reload');
check((await page.inputValue('[data-bind="person.name.ta"]')) === 'சாரா குமார்', 'Tamil value survives a reload');

const bilingualFill = await page.evaluate(() => [...document.querySelectorAll('[data-fill]')].map((e) => e.textContent).join(' / '));
console.log(`info bilingual fill with minimal content: ${bilingualFill}`);

// A font from this computer, when the macOS Helvetica collection is present.
const helvetica = '/System/Library/Fonts/Helvetica.ttc';
if (existsSync(helvetica)) {
  const before = await page.innerHTML('#preview-front');
  await menu('look');
  await page.selectOption('[data-bind="font"]', 'custom');
  await page.setInputFiles('#font-file-regular', helvetica);
  await page.waitForFunction(() => /Helvetica/.test(document.querySelector('#font-status')?.textContent ?? ''), null, { timeout: 15000 });
  await page.waitForTimeout(600);
  const after = await page.innerHTML('#preview-front');
  check(after !== before && after.includes('<path d="M'), 'custom font from this computer redraws the card');
  check((await page.textContent('#font-status')).includes('bold weight'), `custom font picks a Bold face (${(await page.textContent('#font-status')).trim()})`);
  await page.reload();
  await page.waitForSelector('#preview-front svg', { timeout: 20000 });
  await page.waitForTimeout(600);
  check((await page.inputValue('[data-bind="font"]')) === 'custom' && (await page.innerHTML('#preview-front')) !== before, 'custom font survives a reload');
  await menu('look');
  await page.selectOption('[data-bind="font"]', 'inter');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
} else {
  console.log('info no Helvetica.ttc here, custom font step skipped');
}

// Back to one language for the downloads
await menu('language');
await page.selectOption('#second-language', '');
check((await page.inputValue('#second-language')) === '', 'choosing no second language makes a one-language card');

await page.keyboard.press('Escape');

// The Look menu changes the card in place, with the front still in view.
const beforeColour = await page.innerHTML('#preview-front');
await menu('look');
await page.click('#look-menu .swatch-blue');
await page.waitForTimeout(300);
check((await page.innerHTML('#preview-front')) !== beforeColour, 'picking a colour in the Look menu redraws the card');
const menuBox = await page.locator('#look-menu').boundingBox();
const lookBox = await page.locator('#menu-look').boundingBox();
check(Math.abs(menuBox.x - lookBox.x) < 2 && menuBox.y > lookBox.y, 'the Look menu opens under its own button');
await page.click('#look-menu .swatch-red');
await page.keyboard.press('Escape');
// A size picked from its menu closes the menu.
await menu('size');
await page.click('#size-menu input[value="id1-landscape"] >> xpath=..');
await page.waitForTimeout(250);
check((await page.getAttribute('#menu-size', 'aria-expanded')) === 'false', 'picking a size closes the Size menu');
await page.waitForTimeout(300);

// Downloads
const downloads = [];
page.on('download', (d) => downloads.push(d));
async function download(selector, count = 1) {
  downloads.length = 0;
  // Every format sits in the Download menu.
  const inMenu = await page.evaluate((sel) => Boolean(document.querySelector(sel)?.closest('#download-menu')), selector);
  if (inMenu) {
    await page.waitForFunction(() => document.querySelector('#download').getAttribute('aria-disabled') !== 'true');
    if (!(await page.evaluate(() => document.querySelector('#download-menu').classList.contains('open')))) await page.click('#download');
    await page.waitForTimeout(250);
  }
  await page.click(selector);
  const deadline = Date.now() + 30000;
  while (downloads.length < count) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${count} download(s) from ${selector}`);
    await page.waitForTimeout(100);
  }
  const files = [];
  for (const dl of downloads.splice(0, count)) {
    const path = join(out, dl.suggestedFilename());
    await dl.saveAs(path);
    files.push({ name: dl.suggestedFilename(), path, bytes: await dl.createReadStream().then(streamToBuffer) });
  }
  return files.length === 1 ? files[0] : files;
}
function streamToBuffer(stream) {
  return new Promise((res, rej) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => res(Buffer.concat(chunks)));
    stream.on('error', rej);
  });
}

await page.waitForFunction(() => document.querySelector('#download').getAttribute('aria-disabled') !== 'true', null, { timeout: 5000 }).catch(() => {});
check((await page.getAttribute('#download', 'aria-disabled')) === 'false', 'export enabled when the card fits');

const [svg] = await download('#dl-svg', 2);
check(/^medical-card-sara-kumar-(front|back)-\d{4}-\d{2}-\d{2}\.svg$/.test(svg.name), `svg file name ${svg.name}`);
check(svg.bytes.toString().includes('width="85.6mm"') && !svg.bytes.toString().includes('<text'), 'svg is mm-sized with outlined text');

// PNG of each side in the card view, one lock-screen image as the primary download in the phone view.
const [png] = await download('#dl-png', 2);
const phys = readPhys(new Uint8Array(png.bytes));
check(phys?.x === 23622 && phys?.unit === 1, `png carries pHYs at 600 dpi (${JSON.stringify(phys)})`);

await page.click('#view-phone');
check(await page.locator('#preview-phone svg').count() === 1, 'phone view shows the lock screen image');
check(await page.isVisible('#phone-tip'), 'the phone view explains how to use the image');
const lock = await download('#dl-phone');
const pngSize = (b) => ({ w: b.readUInt32BE(16), h: b.readUInt32BE(20) });
const lockSize = pngSize(lock.bytes);
check(/-lock-screen-/.test(lock.name) && lockSize.w === 1080 && lockSize.h === 2400, `lock screen png ${lock.name} is ${lockSize.w} × ${lockSize.h}`);
await page.click('#view-card');

const pdf = await download('#dl-pdf');
check(pdf.bytes.subarray(0, 5).toString() === '%PDF-', 'pdf has a PDF header');
const sheet = await download('#dl-sheet');
check(/-print-at-home-/.test(sheet.name) && sheet.bytes.subarray(0, 5).toString() === '%PDF-', `print-at-home sheet ${sheet.name}`);
check(/\/MediaBox\s*\[\s*0\s+0\s+595\.2/.test(sheet.bytes.toString('latin1')), 'print-at-home sheet is A4 for an Indian card');

// Clearing asks first.
await menu('file');
await page.click('#clear');
check(await page.isVisible('#clear-confirm'), 'clear asks before removing the card');
await page.click('#clear-no');
check((await page.inputValue('[data-bind="person.name.en"]')) === 'Sara Kumar', 'keeping the card leaves it untouched');
check(pdf.bytes.length > 5000, `pdf is ${pdf.bytes.length} bytes`);
check(/\/Type\s*\/Page[^s]/.test(pdf.bytes.toString('latin1')), 'pdf has pages');

await page.screenshot({ path: join(out, 'editor.png'), fullPage: true });

check(foreign.length === 0, `no requests left the origin ${foreign.length ? JSON.stringify(foreign) : ''}`);
check(errors.length === 0, `no page errors ${errors.length ? JSON.stringify(errors) : ''}`);

await browser.close();
console.log(fails.length ? `\n${fails.length} check(s) failed` : '\nall checks passed');
process.exit(fails.length ? 1 : 0);

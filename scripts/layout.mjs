/**
 * Layout check across screen sizes, from a small phone to a wide monitor,
 * with a blank card and a filled one. Run against a preview or dev server:
 *
 *   node scripts/layout.mjs http://127.0.0.1:4321/
 *
 * At each size it checks that the page never scrolls sideways, the header
 * stays compact, the four menus above the card sit on one line, every menu
 * opens under its own button and inside the screen, and nothing spills out
 * of its panel. Screenshots go to .fixtures-out/layout/.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const url = process.argv[2] ?? 'http://127.0.0.1:4321/';
const out = join(process.cwd(), '.fixtures-out', 'layout');
mkdirSync(out, { recursive: true });
const example = readFileSync(join(process.cwd(), 'src', 'data', 'example-card.json'), 'utf8');

const SIZES = [
  { name: 'phone-small', width: 360, height: 740, mobile: true },
  { name: 'phone', width: 390, height: 844, mobile: true },
  { name: 'tablet', width: 768, height: 1024, mobile: true },
  { name: 'laptop-small', width: 1024, height: 768 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide', width: 1920, height: 1080 },
];
const MENUS = ['file', 'language', 'size', 'look'];

const browser = await chromium.launch({ channel: 'chrome' });
let failures = 0;
const check = (ok, msg) => {
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
};

for (const size of SIZES) {
  for (const filled of [false, true]) {
    const label = `${size.name} ${size.width}px ${filled ? 'filled' : 'blank'}`;
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, isMobile: Boolean(size.mobile), hasTouch: Boolean(size.mobile) });
    const page = await context.newPage();
    if (filled) await page.addInitScript((state) => localStorage.setItem('medical-card:v1', state), example);
    await page.goto(url);
    await page.waitForSelector('#preview-front svg', { timeout: 30000 });
    await page.waitForTimeout(300);

    const m = await page.evaluate((menus) => {
      const box = (el) => el.getBoundingClientRect();
      const tops = menus.map((id) => Math.round(box(document.querySelector(`#menu-${id}`)).top));
      const spills = [...document.querySelectorAll('.surface, .menubar, .site-header, .site-footer')].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.className.split(' ')[0]);
      return {
        pageWidth: document.documentElement.scrollWidth,
        header: Math.round(box(document.querySelector('.site-header')).height),
        tops,
        spills,
        download: box(document.querySelector('#download')),
      };
    }, MENUS);
    check(m.pageWidth <= size.width, `${label}: no sideways scroll (page ${m.pageWidth}px wide)`);
    check(m.header <= (size.width < 1024 ? 120 : 100), `${label}: header is ${m.header}px tall`);
    check(new Set(m.tops).size === 1, `${label}: the four menus share one line`);
    check(m.download.right <= size.width && m.download.left >= 0, `${label}: Download is on screen`);
    check(m.spills.length === 0, `${label}: nothing spills out of its panel${m.spills.length ? ` (${m.spills.join(', ')})` : ''}`);

    // Every help tooltip, once opened, sits inside the screen.
    const tips = await page.$$('.tip:visible');
    const outside = [];
    for (const tip of tips) {
      await tip.scrollIntoViewIfNeeded();
      if (size.mobile) await tip.tap(); else await tip.hover();
      const r = await tip.evaluate((el) => {
        const icon = el.getBoundingClientRect();
        const after = getComputedStyle(el, '::after');
        const shift = after.transform === 'none' ? 0 : new DOMMatrix(after.transform).m41;
        const left = icon.left + parseFloat(after.left) + shift;
        return { left, right: left + parseFloat(after.width), label: el.getAttribute('aria-label').slice(0, 30) };
      });
      if (r.left < 0 || r.right > size.width) outside.push(r.label);
    }
    check(outside.length === 0, `${label}: all ${tips.length} help tooltips open inside the screen${outside.length ? ` (${outside.join('; ')})` : ''}`);
    await page.mouse.move(0, 0);

    if (filled) {
      for (const id of MENUS) {
        await page.click(`#menu-${id}`);
        await page.waitForTimeout(220);
        const r = await page.evaluate((id) => {
          const b = document.querySelector(`#menu-${id}`).getBoundingClientRect();
          const menu = document.querySelector(`#${id}-menu`).getBoundingClientRect();
          return { left: menu.left, right: menu.right, top: menu.top, triggerLeft: b.left, triggerBottom: b.bottom };
        }, id);
        // On a phone a menu opens full width under the bar. Elsewhere it opens under its own button.
        const placed = size.width < 640 ? r.top >= r.triggerBottom - 1 : r.top >= r.triggerBottom - 1 && Math.abs(r.left - r.triggerLeft) < 2;
        check(placed && r.left >= 0 && r.right <= size.width + 1, `${label}: the ${id} menu opens ${size.width < 640 ? 'under the bar' : 'under its button'} and inside the screen`);
        if (id === 'look') await page.screenshot({ path: join(out, `${size.name}-look.png`) });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(150);
      }
      await page.screenshot({ path: join(out, `${size.name}.png`), fullPage: true });
    }
    await context.close();
  }
}

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nall sizes clear');
process.exit(failures ? 1 : 0);

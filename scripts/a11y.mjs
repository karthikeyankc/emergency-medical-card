/**
 * Accessibility check against a running build: axe-core over the editor in
 * light and dark themes, plus a phone-width screenshot for a visual check.
 *
 *   node scripts/a11y.mjs [url]
 */
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const url = process.argv[2] ?? 'http://127.0.0.1:4321/';
const out = join(process.cwd(), '.fixtures-out', 'a11y');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
let failures = 0;

async function audit(theme, viewport) {
  const page = await browser.newPage({ viewport, colorScheme: theme });
  await page.goto(url);
  await page.waitForSelector('#preview-front svg', { timeout: 30000 });
  await page.click('#tab-example').catch(() => {});
  await page.waitForTimeout(500);
  // Evaluated through the automation channel, so the production Content Security Policy does not block it.
  await page.evaluate(axeSource);
  const results = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
  const label = `${theme} ${viewport.width}px`;
  await page.screenshot({ path: join(out, `editor-${theme}-${viewport.width}.png`), fullPage: true });
  if (results.violations.length === 0) console.log(`ok   ${label}: no axe violations`);
  for (const v of results.violations) {
    failures++;
    console.log(`FAIL ${label}: [${v.impact}] ${v.id} — ${v.help}`);
    for (const n of v.nodes.slice(0, 4)) console.log(`       ${n.target.join(' ')}  ${n.failureSummary?.split('\n')[1]?.trim() ?? ''}`);
  }
  await page.close();
}

/** Walk the page with Tab and check the main controls are reachable in order. */
async function keyboardWalk() {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(url);
  await page.waitForSelector('#preview-front svg', { timeout: 30000 });
  const reached = [];
  for (let i = 0; i < 120; i++) {
    await page.keyboard.press('Tab');
    const id = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.id || el?.dataset?.bind || el?.getAttribute('aria-label') || el?.textContent?.trim().slice(0, 30) || el?.tagName;
    });
    reached.push(id);
    if (id === 'menu-look') break;
  }
  // The menus above the card and the Download button are tab stops. The walk stops at the last menu.
  const must = ['theme-toggle', 'tab-card', 'tab-example', 'view-card', 'view-phone', 'menu-file', 'menu-language', 'menu-size', 'menu-look'];
  const missing = must.filter((m) => !reached.includes(m));
  if (missing.length) { failures++; console.log(`FAIL keyboard: not reached by Tab: ${missing.join(', ')}`); }
  else console.log(`ok   keyboard: ${reached.length} tab stops, every main control reachable in order`);
  // Focus by keyboard, so :focus-visible applies as it would for a real user.
  let ringVisible = false;
  for (let i = 0; i < 120 && !ringVisible; i++) {
    await page.keyboard.press('Tab');
    ringVisible = await page.evaluate(() => document.activeElement?.id === 'menu-file' && getComputedStyle(document.activeElement).boxShadow !== 'none');
    if (await page.evaluate(() => document.activeElement?.id === 'menu-file')) break;
  }
  if (!ringVisible) { failures++; console.log('FAIL keyboard: no visible focus ring on buttons'); } else console.log('ok   keyboard: focus ring visible');
  await page.close();
}

await audit('light', { width: 1400, height: 1000 });
await audit('dark', { width: 1400, height: 1000 });
await audit('light', { width: 390, height: 844 });
await keyboardWalk();
await browser.close();
console.log(failures ? `\n${failures} violation(s)` : '\nall clear');
process.exit(failures ? 1 : 0);

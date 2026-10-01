import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { headersFile } from './src/headers.js';

const unused = fileURLToPath(new URL('./src/export/unused.js', import.meta.url));

const site = (process.env.SITE_URL || '').replace(/\/$/, '');
const base = (process.env.BASE_PATH || '').replace(/\/$/, '');
const PAGES = ['/', '/privacy', '/terms'];

/**
 * After the build, writes dist/_headers from src/headers.js. With SITE_URL
 * set, it also writes the sitemap and points robots.txt at it. Without
 * SITE_URL, canonical URLs, the social image, and the sitemap need an
 * absolute address, so the build says so.
 */
const headers = {
  name: 'headers',
  hooks: {
    'astro:build:done': ({ dir, logger }) => {
      writeFileSync(new URL('_headers', dir), headersFile(base));
      if (!site) {
        logger.warn('SITE_URL is not set, so there is no sitemap, canonical URL, or absolute social image. Set it for a production build.');
        return;
      }
      const urls = PAGES.map((path) => `  <url><loc>${site}${base}${path}</loc></url>`).join('\n');
      writeFileSync(new URL('sitemap.xml', dir), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
      const robots = readFileSync(new URL('robots.txt', dir), 'utf8').trimEnd();
      writeFileSync(new URL('robots.txt', dir), `${robots}\n\nSitemap: ${site}${base}/sitemap.xml\n`);
    },
  },
};

export default defineConfig({
  output: 'static',
  // privacy.html and terms.html, so a host serves them at /privacy and /terms, the URLs the canonical tags name.
  build: { inlineStylesheets: 'never', format: 'file' },
  site: process.env.SITE_URL || undefined,
  base: base || '/',
  integrations: [headers],
  vite: {
    plugins: [tailwindcss()],
    resolve: { alias: { html2canvas: unused, dompurify: unused, canvg: unused } },
    // The HarfBuzz glue resolves its wasm with `new URL('harfbuzz.wasm', import.meta.url)`.
    // Keeping it out of dependency pre-bundling lets Vite serve the file from its own path.
    // jsPDF and svg2pdf are only imported when the PDF button is pressed. Without
    // pre-bundling, dev discovers them late, re-optimises, and the import fails with a 504.
    optimizeDeps: { exclude: ['harfbuzzjs'], include: ['jspdf', 'svg2pdf.js'] },
    assetsInclude: ['**/*.ttf', '**/*.wasm'],
  },
});

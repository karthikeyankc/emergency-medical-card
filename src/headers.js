/**
 * Security and cache headers, in one place. Base.astro puts the CSP in a
 * meta tag so any static host enforces it. The build also writes
 * dist/_headers for hosts that read that file (Cloudflare Pages, Netlify),
 * which adds what a meta tag cannot carry.
 */

export const csp = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "style-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** The dist/_headers file. Hashed assets never change, so browsers keep them for a year. */
export function headersFile() {
  return [
    '/*',
    `  Content-Security-Policy: ${csp}; frame-ancestors 'none'`,
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: DENY',
    '  Referrer-Policy: no-referrer',
    '  Cross-Origin-Opener-Policy: same-origin',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    '',
    '/_astro/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ].join('\n');
}

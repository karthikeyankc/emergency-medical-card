/**
 * Links inside the site. BASE_PATH at build time sets Astro's base, and every
 * link to a page or to a file in public/ goes through `href` so it carries that
 * base. A site served at the root has an empty base.
 */
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** '/privacy' becomes '/emergency-medical-card/privacy' when the base is /emergency-medical-card. */
export const href = (path) => `${base}${path}`;

/** Hand a Blob to the browser as a download. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

import { isoToday } from '../card/state.js';

/**
 * Every file is named after the person, so a family's downloads can be told
 * apart: medical-card-<name>-<side>-<date>.<ext>. A backup file holds the
 * same details as the card, so the name reveals nothing the card does not.
 */
export function fileName(ext, side, date = isoToday(), name = '') {
  const slug = String(name)
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  const who = slug ? `-${slug}` : '';
  return side ? `medical-card${who}-${side}-${date}.${ext}` : `medical-card${who}-${date}.${ext}`;
}

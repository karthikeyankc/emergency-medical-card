/** Card state as a file, and back. */
import { migrate } from '../card/state.js';

export function stateBlob(state) {
  return new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
}

/** @param {File} file */
export async function readStateFile(file) {
  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('That file is not valid JSON');
  }
  return migrate(parsed);
}

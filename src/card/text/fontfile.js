/**
 * Inspect a font file the user brings from their own computer. Handles
 * single fonts, TrueType Collections (several faces in one file), and
 * variable fonts (weights on the wght axis).
 */
import * as hb from 'harfbuzzjs';

const FAMILY = 1;
const SUBFAMILY = 2;

function name(face, nameId) {
  const names = face.listNames();
  const entry = names.find((n) => n.nameId === nameId && /^en/i.test(n.language ?? 'en')) ?? names.find((n) => n.nameId === nameId);
  return entry ? face.getName(nameId, entry.language) : '';
}

/**
 * Number of faces in the file, from its header. 'ttcf' is a collection with
 * a count at offset 8. Anything else that is a font has exactly one.
 */
function faceCount(data) {
  const v = new DataView(data);
  if (data.byteLength < 12) throw new Error('That file is not a font this tool can read');
  const tag = v.getUint32(0);
  if (tag === 0x74746366) return v.getUint32(8); // 'ttcf'
  if (tag === 0x00010000 || tag === 0x4f54544f || tag === 0x74727565) return 1; // TrueType, 'OTTO', 'true'
  throw new Error('That file is not a font this tool can read');
}

/**
 * @param {ArrayBuffer} data
 * @returns {{ faces: { index: number, family: string, style: string, variable: boolean }[] }}
 */
export function inspectFontFile(data) {
  const count = faceCount(data);
  const blob = new hb.Blob(data);
  const faces = [];
  for (let index = 0; index < count; index++) {
    const face = new hb.Face(blob, index);
    if (!face.upem) continue;
    faces.push({ index, family: name(face, FAMILY), style: name(face, SUBFAMILY), variable: Boolean(face.getAxisInfos().wght) });
  }
  if (!faces.length) throw new Error('That file is not a font this tool can read');
  return { faces };
}

const REGULAR = /^(regular|book|normal|roman|medium)$/i;
const BOLD = /^bold$/i;

/**
 * Choose the faces to use for Regular and Bold. A variable face serves
 * both through the weight axis. A collection is searched by style name.
 * Bold falls back to Regular when nothing suitable exists.
 */
export function pickFaces(faces) {
  const regular = faces.find((f) => REGULAR.test(f.style)) ?? faces[0];
  if (regular.variable) return { regular, bold: regular, boldSynthetic: false, viaAxis: true };
  const bold = faces.find((f) => BOLD.test(f.style) && f.family === regular.family) ?? faces.find((f) => BOLD.test(f.style));
  return { regular, bold: bold ?? regular, boldSynthetic: !bold, viaAxis: false };
}

/** Font files in the shape createShaper takes, from a stored custom font record. */
export function customFontFiles(record) {
  const latin = {};
  const reg = record.regular;
  const bold = record.bold ?? reg;
  latin[400] = { data: reg.data, faceIndex: reg.faceIndex, variations: reg.variable ? { wght: 400 } : {} };
  latin[700] = { data: bold.data, faceIndex: bold.faceIndex, variations: bold.variable ? { wght: 700 } : {} };
  return latin;
}

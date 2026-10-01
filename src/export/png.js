/**
 * SVG to PNG at a physical density, with a pHYs chunk so print software
 * places the card at its true size.
 */

const MM_PER_INCH = 25.4;

/** Pixel size of a card at a density. */
export function pixelSize(widthMm, heightMm, dpi) {
  return {
    width: Math.round((widthMm / MM_PER_INCH) * dpi),
    height: Math.round((heightMm / MM_PER_INCH) * dpi),
  };
}

/**
 * Rasterise an SVG string through an offscreen canvas.
 * @returns {Promise<Blob>} PNG with pHYs
 */
export async function svgToPng(svg, widthMm, heightMm, dpi) {
  const { width, height } = pixelSize(widthMm, heightMm, dpi);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext('2d');
    g.fillStyle = '#FFFFFF';
    g.fillRect(0, 0, width, height);
    g.drawImage(img, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return new Blob([withPhys(bytes, dpi)], { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not rasterise the card'));
    img.src = url;
  });
}

/* ── pHYs ───────────────────────────────────────────────────────────── */

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/** Pixels per metre for a dpi value. */
export function pixelsPerMetre(dpi) {
  return Math.round(dpi / 0.0254);
}

/**
 * Insert (or replace) a pHYs chunk right after IHDR.
 * @param {Uint8Array} png
 * @param {number} dpi
 * @returns {Uint8Array}
 */
export function withPhys(png, dpi) {
  for (let i = 0; i < 8; i++) if (png[i] !== SIGNATURE[i]) throw new Error('Not a PNG');
  const chunks = [];
  let offset = 8;
  while (offset < png.length) {
    const length = readU32(png, offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    const end = offset + 12 + length;
    chunks.push({ type, bytes: png.subarray(offset, end) });
    offset = end;
  }
  const ppm = pixelsPerMetre(dpi);
  const data = new Uint8Array(9);
  writeU32(data, 0, ppm);
  writeU32(data, 4, ppm);
  data[8] = 1; // unit is the metre
  const phys = makeChunk('pHYs', data);

  const out = [];
  for (const chunk of chunks) {
    if (chunk.type === 'pHYs') continue;
    out.push(chunk.bytes);
    if (chunk.type === 'IHDR') out.push(phys);
  }
  return concat([new Uint8Array(SIGNATURE), ...out]);
}

/** Read the pHYs chunk of a PNG, if present. */
export function readPhys(png) {
  let offset = 8;
  while (offset < png.length) {
    const length = readU32(png, offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    if (type === 'pHYs') {
      const d = offset + 8;
      return { x: readU32(png, d), y: readU32(png, d + 4), unit: png[d + 8] };
    }
    offset += 12 + length;
  }
  return null;
}

function makeChunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  writeU32(out, 0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  writeU32(out, 8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function readU32(b, o) {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}
function writeU32(b, o, v) {
  b[o] = (v >>> 24) & 255;
  b[o + 1] = (v >>> 16) & 255;
  b[o + 2] = (v >>> 8) & 255;
  b[o + 3] = v & 255;
}
function concat(arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const a of arrays) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}

let table;
function crc32(bytes) {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of bytes) crc = table[(crc ^ b) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Rasterise an SVG to an exact pixel size. */
export async function svgToPngPixels(svg, width, height) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext('2d');
    g.drawImage(img, 0, 0, width, height);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

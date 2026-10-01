/**
 * Vector PDF from the export SVGs. One page per side at exact card size.
 */
import { jsPDF } from 'jspdf';
import 'svg2pdf.js';

/**
 * @param {string[]} svgs one export SVG per page
 * @param {number} widthMm
 * @param {number} heightMm
 * @returns {Promise<Blob>}
 */
export async function svgsToPdf(svgs, widthMm, heightMm) {
  const doc = new jsPDF({
    unit: 'mm',
    format: [widthMm, heightMm],
    orientation: widthMm >= heightMm ? 'landscape' : 'portrait',
    compress: true,
  });
  const parser = new DOMParser();
  for (let i = 0; i < svgs.length; i++) {
    if (i > 0) doc.addPage([widthMm, heightMm], widthMm >= heightMm ? 'landscape' : 'portrait');
    const el = parser.parseFromString(svgs[i], 'image/svg+xml').documentElement;
    await doc.svg(el, { x: 0, y: 0, width: widthMm, height: heightMm });
  }
  return doc.output('blob');
}

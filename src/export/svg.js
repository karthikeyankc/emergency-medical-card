/** The renderer's export SVG is already the file. Add the XML declaration. */
export function svgBlob(svg) {
  return new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svg}`], { type: 'image/svg+xml' });
}

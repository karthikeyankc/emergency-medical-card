/**
 * Stands in for jsPDF's optional html2canvas, DOMPurify, and canvg. The
 * card's PDF goes through svg2pdf.js, which never calls them, so the build
 * aliases them here instead of shipping them.
 */
export default {};

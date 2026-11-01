// The generated PDF and link-preview image, inlined at build time so they are emitted only by
// this experience's own routes, and only in builds where the resume is released.
import pdfData from './assets/resume.pdf?inline';
import ogData from './assets/og.png?inline';

const bytes = (dataUrl: string) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');

export const pdf = bytes(pdfData);
export const og = bytes(ogData);

/** Pages in the PDF: page objects are `/Type /Page` (the tree's root is `/Type /Pages`). */
export const pdfPages = (pdf.toString('latin1').match(/\/Type\s*\/Page(?![a-z])/g) ?? []).length;
export const pdfKb = Math.round(pdf.length / 1024);

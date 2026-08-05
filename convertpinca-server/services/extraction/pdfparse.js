import pdfParse from 'pdf-parse/lib/pdf-parse.js';

/**
 * Extracts raw text content from a PDF buffer using pdf-parse.
 * @param {Buffer} pdfBuffer - Raw PDF file bytes
 * @returns {Promise<string>} - Full text content of the PDF
 */
export async function extractText(pdfBuffer) {
  const data = await pdfParse(pdfBuffer);
  return data.text;
}

/**
 * Fallback extraction: parses PDF text and runs a template-defined regex extractor.
 * @param {Buffer} pdfBuffer - Raw PDF file bytes
 * @param {Function} extractorFn - Template's regexExtractor(text) function
 * @returns {Promise<object>} - Extracted data object matching the template schema
 */
export async function regexExtract(pdfBuffer, extractorFn) {
  if (typeof extractorFn !== 'function') {
    throw new Error('No regex extractor defined for this template.');
  }
  const text = await extractText(pdfBuffer);
  return extractorFn(text);
}

import { getGeminiClient } from '../../config/gemini.js';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

/**
 * Extracts structured data from a PDF using Gemini Flash-Lite.
 * @param {string} pdfBase64 - Base64 encoded PDF content
 * @param {object} schema - JSON schema describing fields to extract
 * @returns {Promise<object>} - Extracted data matching the schema
 */
export async function extractFromPdf(pdfBase64, schema) {
  const ai = getGeminiClient();

  const prompt = `You are a precise financial-document extraction assistant. Extract every field and every service row from the provided PDF.

Return ONLY a valid JSON object matching this exact schema. Do not return markdown, explanations, or code fences:
${JSON.stringify(schema, null, 2)}

Rules:
- Extract the invoice number exactly as printed. Use null only when it truly does not exist.
- Extract every service/category row from the expenditure summary, including rows with zero values.
- Preserve the original category names.
- All monetary values must be plain numbers in USD, without currency symbols or commas.
- Do not calculate or invent totals. Copy stated totals from the document.
- Use null for unavailable scalar fields and [] only when the document genuinely contains no service rows.
- Dates must be formatted as YYYY-MM-DD where the schema requests a date.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
          { text: prompt },
        ],
      },
    ],
    config: { responseMimeType: 'application/json' },
  });

  const raw = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error(`Gemini returned an empty response using model ${GEMINI_MODEL}.`);

  try {
    return JSON.parse(raw);
  } catch {
    const cleaned = raw.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
    return JSON.parse(cleaned);
  }
}

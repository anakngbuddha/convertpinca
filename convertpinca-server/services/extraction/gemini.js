import { getGeminiClient } from '../../config/gemini.js';

/**
 * Extracts structured data from a PDF using Gemini Flash AI.
 * @param {string} pdfBase64 - Base64 encoded PDF content
 * @param {object} schema - JSON schema describing fields to extract
 * @returns {Promise<object>} - Extracted data matching the schema
 */
export async function extractFromPdf(pdfBase64, schema) {
  const ai = getGeminiClient();

  const prompt = `You are a precise data extraction assistant. Extract all fields from the provided PDF document.
  
Return ONLY a valid JSON object matching this exact schema — no markdown fences, no commentary:
${JSON.stringify(schema, null, 2)}

Rules:
- Use null for any field you cannot find.
- For arrays (e.g. lineItems), extract all rows found.
- All numeric fields must be plain numbers (no currency symbols or commas).
- Dates must be formatted as YYYY-MM-DD.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
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
  if (!raw) throw new Error('Gemini returned an empty response.');

  try {
    return JSON.parse(raw);
  } catch {
    // Try stripping markdown fences as fallback
    const cleaned = raw.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
    return JSON.parse(cleaned);
  }
}

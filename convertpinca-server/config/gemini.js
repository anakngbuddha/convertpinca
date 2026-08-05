import { GoogleGenAI } from '@google/genai';

function readGeminiApiKey() {
  const raw = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  const key = raw.trim().replace(/^Bearer\s+/i, '');

  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured. Set a Google AI Studio API key in Render environment variables.');
  }

  // OAuth access tokens (ya29.*, JWTs, and service-account tokens) are not valid
  // for the Gemini Developer API client. They produce the misleading
  // ACCESS_TOKEN_TYPE_UNSUPPORTED response seen in production.
  if (/^(ya29\.|eyJ)/i.test(key)) {
    throw new Error('GEMINI_API_KEY contains an OAuth/JWT token, not a Gemini API key. Create an API key in Google AI Studio and replace the Render variable.');
  }

  return key;
}

export function getGeminiClient() {
  const apiKey = readGeminiApiKey();
  return new GoogleGenAI({ apiKey, vertexai: false });
}

export default getGeminiClient;

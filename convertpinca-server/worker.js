import 'dotenv/config';
import { popJob } from './services/jobs/queue.js';
import { updateJob } from './services/jobs/repository.js';
import { extractFromPdf } from './services/extraction/gemini.js';
import { regexExtract } from './services/extraction/pdfparse.js';
import { fetchFile, upload as storeFile } from './services/storage/index.js';
import { writeExcel } from './services/excel/writer.js';
import { reconcile } from './services/validation/reconcile.js';
import { getTemplate } from './templates/index.js';

console.log('🔧 ConvertPinca Worker started. Waiting for jobs...\n');

async function processJob(payload) {
  const { jobId, sourceUrl, templateId } = payload;
  console.log(`[Job ${jobId}] Starting — template: ${templateId}`);

  // Mark as processing
  await updateJob(jobId, { status: 'processing' });

  // Load template config
  const template = getTemplate(templateId);

  // Fetch the PDF from storage
  const pdfBuffer = await fetchFile(sourceUrl);

  // --- Extraction: Gemini first, regex fallback ---
  let extracted;
  let extractionMethod = 'gemini';

  try {
    console.log(`[Job ${jobId}] Extracting with Gemini...`);
    const pdfBase64 = pdfBuffer.toString('base64');
    extracted = await extractFromPdf(pdfBase64, template.schema);
  } catch (geminiErr) {
    console.warn(`[Job ${jobId}] ⚠️  Gemini failed (${geminiErr.message}). Trying regex fallback...`);
    try {
      extracted = await regexExtract(pdfBuffer, template.regexExtractor);
      extractionMethod = 'regex-fallback';
      console.log(`[Job ${jobId}] ✅ Regex fallback succeeded.`);
    } catch (regexErr) {
      console.error(`[Job ${jobId}] ❌ Regex fallback also failed: ${regexErr.message}`);
      throw geminiErr; // surface the original Gemini error as primary cause
    }
  }

  console.log(`[Job ${jobId}] Extracted via ${extractionMethod}.`);

  // Sanity check
  const { valid, warnings } = reconcile(extracted);
  if (warnings.length > 0) {
    console.warn(`[Job ${jobId}] Validation warnings:`, warnings);
  }

  // Write Excel
  console.log(`[Job ${jobId}] Writing Excel...`);
  const excelBuffer = await writeExcel(template.templatePath, template.cellMap, extracted);

  // Upload result
  const resultFilename = `result-${jobId}.xlsx`;
  const resultUrl = await storeFile(excelBuffer, resultFilename, 'results');

  // Mark as done
  await updateJob(jobId, { status: 'done', resultUrl });
  console.log(`[Job ${jobId}] ✅ Done (${extractionMethod}) — result: ${resultUrl}`);
}

async function runWorkerLoop() {
  while (true) {
    try {
      const payload = await popJob(5); // 5-second timeout per cycle
      if (!payload) continue;

      await processJob(payload);
    } catch (err) {
      console.error(`[Worker Error]`, err.message);

      // If payload had a jobId, mark it failed
      if (err._jobId) {
        try {
          await updateJob(err._jobId, {
            status: 'failed',
            errorMessage: err.message,
          });
        } catch (dbErr) {
          console.error('[Worker] Could not update failed job status:', dbErr.message);
        }
      }

      // Brief pause before retrying to prevent tight error loops
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// Wrap processJob to attach jobId to errors
const originalProcessJob = processJob;
async function processJobWithContext(payload) {
  try {
    await originalProcessJob(payload);
  } catch (err) {
    err._jobId = payload?.jobId;
    throw err;
  }
}

runWorkerLoop().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});

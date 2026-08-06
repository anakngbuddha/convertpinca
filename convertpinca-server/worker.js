import 'dotenv/config';
import { popJob } from './services/jobs/queue.js';
import { updateJob } from './services/jobs/repository.js';
import { extractFromPdf } from './services/extraction/gemini.js';
import { regexExtract } from './services/extraction/pdfparse.js';
import { normalizeInvoiceData } from './services/extraction/normalize.js';
import { reconcile } from './services/validation/reconcile.js';
import { fetchFile, upload as storeFile } from './services/storage/index.js';
import { writeExcel } from './services/excel/writer.js';
import { getTemplate } from './templates/index.js';

console.log('🔧 ConvertPinca Worker started. Pipeline initialized.\n');

async function processJob(payload) {
  const { jobId, sourceUrl, templateId, conversion } = payload;
  console.log(`[Job ${jobId}] Processing — template: ${templateId}`);
  await updateJob(jobId, { status: 'processing' });

  const template = getTemplate(templateId);
  if (!template) throw new Error(`Unknown or unsupported templateId: "${templateId}"`);
  const pdfBuffer = await fetchFile(sourceUrl);

  let rawData;
  let extractionMethod = 'gemini';
  try {
    console.log(`[Job ${jobId}] Extracting with Gemini...`);
    rawData = await extractFromPdf(pdfBuffer.toString('base64'), template.schema);
  } catch (geminiErr) {
    console.warn(`[Job ${jobId}] ⚠️ Gemini extraction failed (${geminiErr.message}). Trying regex fallback...`);
    try {
      rawData = await regexExtract(pdfBuffer, template.regexExtractor);
      extractionMethod = 'regex-fallback';
      console.log(`[Job ${jobId}] ✅ Regex fallback succeeded.`);
    } catch (regexErr) {
      console.error(`[Job ${jobId}] ❌ Regex fallback also failed: ${regexErr.message}`);
      throw geminiErr;
    }
  }

  console.log(`[Job ${jobId}] Normalizing extracted data...`);
  const canonicalModel = normalizeInvoiceData(rawData, templateId, extractionMethod);
  const reconciliation = reconcile(canonicalModel);
  if (!reconciliation.reconciled) {
    const failureReason = reconciliation.errors.join(' | ');
    console.error(`[Job ${jobId}] ❌ Reconciliation failed: ${failureReason}`);
    await updateJob(jobId, { status: 'failed', errorMessage: `Validation / Reconciliation Failed: ${failureReason}` });
    return;
  }

  console.log(`[Job ${jobId}] Rendering Excel with conversion settings...`);
  const excelBuffer = await writeExcel(template.templatePath, template, canonicalModel, conversion);
  const resultUrl = await storeFile(excelBuffer, `result-${jobId}.xlsx`, 'results');
  await updateJob(jobId, { status: 'done', resultUrl });
  console.log(`[Job ${jobId}] 🎉 Complete! Result uploaded to: ${resultUrl}`);
}

async function runWorkerLoop() {
  while (true) {
    try {
      const payload = await popJob(5);
      if (!payload) continue;
      await processJobWithContext(payload);
    } catch (err) {
      console.error('[Worker Error]', err.message);
      if (err._jobId) await updateJob(err._jobId, { status: 'failed', errorMessage: err.message });
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function processJobWithContext(payload) {
  try { await processJob(payload); } catch (err) { err._jobId = payload?.jobId; throw err; }
}

runWorkerLoop().catch((err) => {
  console.error('[Worker] Fatal loop error:', err);
  process.exit(1);
});

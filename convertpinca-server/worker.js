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
  const { jobId, sourceUrl, templateId } = payload;
  console.log(`[Job ${jobId}] Processing — template: ${templateId}`);

  // 1. Mark status as processing
  await updateJob(jobId, { status: 'processing' });

  // 2. Load template configuration
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Unknown or unsupported templateId: "${templateId}"`);
  }

  // 3. Fetch original PDF file from storage
  const pdfBuffer = await fetchFile(sourceUrl);

  // 4. Extract raw data (Gemini Flash first, Regex fallback second)
  let rawData;
  let extractionMethod = 'gemini';

  try {
    console.log(`[Job ${jobId}] Extracting with Gemini...`);
    const pdfBase64 = pdfBuffer.toString('base64');
    rawData = await extractFromPdf(pdfBase64, template.schema);
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

  // 5. Normalize into Canonical Model
  console.log(`[Job ${jobId}] Normalizing extracted data...`);
  const canonicalModel = normalizeInvoiceData(rawData, templateId, extractionMethod);

  // 6. Hard-Gated Reconciliation & Schema Validation
  console.log(`[Job ${jobId}] Running hard-gated reconciliation check...`);
  const reconciliation = reconcile(canonicalModel);

  if (!reconciliation.reconciled) {
    const failureReason = reconciliation.errors.join(' | ');
    console.error(`[Job ${jobId}] ❌ Reconciliation FAILD: ${failureReason}`);

    // Hard gate: update job status to validation_failed and HALT processing
    await updateJob(jobId, {
      status: 'failed',
      errorMessage: `Validation / Reconciliation Failed: ${failureReason}`,
    });
    return;
  }

  if (reconciliation.warnings.length > 0) {
    console.warn(`[Job ${jobId}] ⚠️ Reconciliation warnings:`, reconciliation.warnings);
  }

  console.log(`[Job ${jobId}] ✅ Reconciliation passed! (Services sum matches invoice total)`);

  // 7. Dynamic Excel Rendering (ExcelJS)
  console.log(`[Job ${jobId}] Rendering Excel report (USD)...`);
  const excelBuffer = await writeExcel(template.templatePath, template, canonicalModel);

  // 8. Upload result file to storage
  const resultFilename = `result-${jobId}.xlsx`;
  const resultUrl = await storeFile(excelBuffer, resultFilename, 'results');

  // 9. Update job status to done
  await updateJob(jobId, { status: 'done', resultUrl });
  console.log(`[Job ${jobId}] 🎉 Complete! Result uploaded to: ${resultUrl}`);
}

async function runWorkerLoop() {
  while (true) {
    try {
      const payload = await popJob(5); // 5-second polling interval
      if (!payload) continue;

      await processJobWithContext(payload);
    } catch (err) {
      console.error(`[Worker Error]`, err.message);

      if (err._jobId) {
        try {
          await updateJob(err._jobId, {
            status: 'failed',
            errorMessage: err.message,
          });
        } catch (dbErr) {
          console.error('[Worker] Failed to update job status:', dbErr.message);
        }
      }

      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function processJobWithContext(payload) {
  try {
    await processJob(payload);
  } catch (err) {
    err._jobId = payload?.jobId;
    throw err;
  }
}

runWorkerLoop().catch((err) => {
  console.error('[Worker] Fatal loop error:', err);
  process.exit(1);
});

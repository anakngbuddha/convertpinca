import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import upload from '../middleware/upload.js';
import { createJob } from '../services/jobs/repository.js';
import { pushJob } from '../services/jobs/queue.js';
import { upload as storeFile } from '../services/storage/index.js';
import { getTemplate } from '../templates/index.js';

const router = express.Router();

function parseConversionSettings(body) {
  const exchangeRate = Number(body.exchangeRate);
  const adjustmentPercent = Number(body.adjustmentPercent || 0);
  const adjustmentType = ['none', 'margin', 'discount'].includes(body.adjustmentType)
    ? body.adjustmentType
    : 'none';

  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error('A positive USD to PHP exchange rate is required.');
  }
  if (!Number.isFinite(adjustmentPercent) || adjustmentPercent < 0 || adjustmentPercent > 100) {
    throw new Error('Margin or discount must be between 0 and 100 percent.');
  }

  return {
    vatIncluded: body.vatIncluded === 'true' || body.vatIncluded === true,
    exchangeRate,
    adjustmentType,
    adjustmentPercent,
  };
}

router.post('/', upload.single('pdf'), async (req, res, next) => {
  try {
    const { templateId } = req.body;
    if (!templateId) return res.status(400).json({ error: { message: 'templateId is required.' } });
    if (!req.file) return res.status(400).json({ error: { message: 'A PDF file is required.' } });

    getTemplate(templateId);
    const conversion = parseConversionSettings(req.body);
    const jobId = uuidv4();
    const filename = `pdf-${jobId}.pdf`;
    const sourceUrl = await storeFile(req.file.buffer, filename, 'pdfs');

    await createJob({ id: jobId, templateId, sourceUrl });
    await pushJob({ jobId, sourceUrl, templateId, conversion });
    res.status(202).json({ jobId });
  } catch (err) {
    next(err);
  }
});

export default router;

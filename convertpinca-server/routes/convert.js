import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import upload from '../middleware/upload.js';
import { createJob } from '../services/jobs/repository.js';
import { pushJob } from '../services/jobs/queue.js';
import { upload as storeFile } from '../services/storage/index.js';
import { getTemplate } from '../templates/index.js';

const router = express.Router();

/**
 * POST /api/convert
 * Accepts a PDF upload + templateId, stores the file, enqueues a job, returns { jobId }.
 */
router.post('/', upload.single('pdf'), async (req, res, next) => {
  try {
    const { templateId } = req.body;
    if (!templateId) {
      return res.status(400).json({ error: { message: 'templateId is required.' } });
    }
    if (!req.file) {
      return res.status(400).json({ error: { message: 'A PDF file is required.' } });
    }

    // Validate template exists
    getTemplate(templateId);

    const jobId = uuidv4();
    const filename = `pdf-${jobId}.pdf`;

    // Upload PDF to storage (Cloudinary or local)
    const sourceUrl = await storeFile(req.file.buffer, filename, 'pdfs');

    // Create DB record
    await createJob({ id: jobId, templateId, sourceUrl });

    // Enqueue processing job
    await pushJob({ jobId, sourceUrl, templateId });

    res.status(202).json({ jobId });
  } catch (err) {
    next(err);
  }
});

export default router;

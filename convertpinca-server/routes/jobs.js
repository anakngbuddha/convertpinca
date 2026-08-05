import express from 'express';
import { getJobById, listJobs } from '../services/jobs/repository.js';

const router = express.Router();

/**
 * GET /api/jobs
 * Returns a list of all recent jobs.
 */
router.get('/', async (req, res, next) => {
  try {
    const jobs = await listJobs();
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/jobs/:id
 * Returns a single job's status, resultUrl, and errorMessage.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const job = await getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: { message: 'Job not found.' } });
    }
    res.json({
      jobId: job.id,
      status: job.status,
      templateId: job.templateId,
      resultUrl: job.resultUrl || null,
      errorMessage: job.errorMessage || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

import { db } from '../../config/db.js';

/**
 * Creates a new job record in the database.
 * @param {{ id: string, templateId: string, sourceUrl: string }} params
 * @returns {Promise<object>} Created job record
 */
export async function createJob({ id, templateId, sourceUrl }) {
  return db.job.create({
    data: { id, templateId, sourceUrl, status: 'pending' },
  });
}

/**
 * Retrieves a job by ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getJobById(id) {
  return db.job.findUnique({ where: { id } });
}

/**
 * Lists all jobs (most recent first, max 100).
 * @returns {Promise<object[]>}
 */
export async function listJobs() {
  return db.job.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

/**
 * Updates a job's status and optional fields.
 * @param {string} id
 * @param {object} data - Prisma update data
 * @returns {Promise<object>}
 */
export async function updateJob(id, data) {
  return db.job.update({ where: { id }, data });
}

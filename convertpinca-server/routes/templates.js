import express from 'express';
import { listTemplates } from '../templates/index.js';

const router = express.Router();

/**
 * GET /api/templates
 * Returns all available template definitions.
 */
router.get('/', (req, res) => {
  res.json({ templates: listTemplates() });
});

export default router;

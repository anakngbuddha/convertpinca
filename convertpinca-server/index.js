import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import convertRoute from './routes/convert.js';
import jobsRoute from './routes/jobs.js';
import templatesRoute from './routes/templates.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve locally stored files (when Cloudinary is not configured)
app.use('/local-files', express.static(path.join(__dirname, 'local-storage')));

// API Routes
app.use('/api/convert', convertRoute);
app.use('/api/jobs', jobsRoute);
app.use('/api/templates', templatesRoute);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Central error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 ConvertPinca API running at http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Templates: http://localhost:${PORT}/api/templates\n`);
});

export default app;

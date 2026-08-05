import db from './db.js';
import { getQueueClient, localQueue } from './queue.js';
import cloudinary, { isCloudinaryConfigured } from './cloudinary.js';
import getGeminiClient from './gemini.js';

export const config = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL,
  isCloudinaryConfigured,
};

export { db, getQueueClient, localQueue, cloudinary, getGeminiClient };
export default config;

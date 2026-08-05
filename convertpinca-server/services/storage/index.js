import { isCloudinaryConfigured } from '../../config/cloudinary.js';
import * as cloudinaryStorage from './cloudinary.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_STORAGE_DIR = path.join(__dirname, '..', '..', 'local-storage');

/**
 * Unified storage provider.
 * Uses Cloudinary when credentials are configured; falls back to local disk.
 */

/**
 * Uploads a buffer, returns a resolvable URL or path.
 * @param {Buffer} buffer
 * @param {string} filename
 * @param {string} folder
 * @returns {Promise<string>}
 */
export async function upload(buffer, filename, folder = 'convertpinca') {
  if (isCloudinaryConfigured) {
    return await cloudinaryStorage.uploadBuffer(buffer, filename, folder);
  }
  // Local fallback
  const dir = path.join(LOCAL_STORAGE_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);
  // Return a local URL-like path the server can serve
  return `/local-files/${folder}/${filename}`;
}

/**
 * Fetches a file by its URL or local path, returns a Buffer.
 * @param {string} urlOrPath
 * @returns {Promise<Buffer>}
 */
export async function fetchFile(urlOrPath) {
  if (isCloudinaryConfigured || urlOrPath.startsWith('http')) {
    return await cloudinaryStorage.fetchBuffer(urlOrPath);
  }
  // Local fallback
  const relativePath = urlOrPath.replace(/^\/local-files\//, '');
  const filePath = path.join(LOCAL_STORAGE_DIR, relativePath);
  return await fs.readFile(filePath);
}

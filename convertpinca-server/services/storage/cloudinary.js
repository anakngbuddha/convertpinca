import { v2 as cloudinaryClient } from 'cloudinary';
import { Readable } from 'stream';

/**
 * Uploads a buffer to Cloudinary as a raw resource.
 * @param {Buffer} buffer - File content buffer
 * @param {string} publicId - Cloudinary public ID
 * @param {string} folder - Cloudinary folder
 * @returns {Promise<string>} - Secure URL of the uploaded file
 */
export async function uploadBuffer(buffer, publicId, folder = 'convertpinca') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinaryClient.uploader.upload_stream(
      {
        resource_type: 'raw',
        public_id: `${folder}/${publicId}`,
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}

/**
 * Fetches a raw file from Cloudinary by its secure URL.
 * @param {string} url - Cloudinary secure URL
 * @returns {Promise<Buffer>} - File content as a Buffer
 */
export async function fetchBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch from Cloudinary: ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

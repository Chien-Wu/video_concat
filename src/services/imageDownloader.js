import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { STORAGE_CONFIG, VIDEO_CONFIG } from '../config/constants.js';

/**
 * Download images from URLs to local temporary storage
 * This ensures stable rendering by avoiding network issues during video generation
 *
 * @param {string[]} imageUrls - Array of image URLs (must be exactly 8 images)
 * @param {string} jobId - Unique job identifier
 * @returns {Promise<string[]>} Array of local file paths
 */
export async function downloadImages(imageUrls, jobId) {
  // Validate image count
  if (!Array.isArray(imageUrls) || imageUrls.length !== VIDEO_CONFIG.IMAGE_COUNT) {
    throw new Error(`Expected exactly ${VIDEO_CONFIG.IMAGE_COUNT} images, got ${imageUrls?.length}`);
  }

  // Create temporary directory for this job
  const tmpDir = path.join(STORAGE_CONFIG.TMP_DIR, jobId);
  await fs.mkdir(tmpDir, { recursive: true });

  const localPaths = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];

    // Validate URL
    if (!url || typeof url !== 'string') {
      throw new Error(`Invalid URL at index ${i}: ${url}`);
    }

    try {
      // Determine file extension from URL or default to jpg
      const urlPath = new URL(url).pathname;
      const ext = path.extname(urlPath) || '.jpg';
      const localPath = path.join(tmpDir, `image-${i}${ext}`);

      // Download image with timeout
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 seconds timeout
        maxContentLength: 50 * 1024 * 1024, // 50MB max
        headers: {
          'User-Agent': 'VideoGenerator/1.0'
        }
      });

      // Validate content type
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error(`URL at index ${i} does not return an image (Content-Type: ${contentType})`);
      }

      // Save image to disk
      await fs.writeFile(localPath, response.data);
      localPaths.push(localPath);

      console.log(`Downloaded image ${i + 1}/${VIDEO_CONFIG.IMAGE_COUNT}: ${localPath}`);
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Timeout downloading image ${i}: ${url}`);
      } else if (error.response) {
        throw new Error(`Failed to download image ${i}: HTTP ${error.response.status} - ${url}`);
      } else {
        throw new Error(`Failed to download image ${i}: ${error.message}`);
      }
    }
  }

  return localPaths;
}

/**
 * Cleanup temporary files for a specific job
 */
export async function cleanupTempFiles(jobId) {
  const tmpDir = path.join(STORAGE_CONFIG.TMP_DIR, jobId);

  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
    console.log(`Cleaned up temp files for job ${jobId}`);
  } catch (error) {
    console.error(`Failed to cleanup temp files for job ${jobId}:`, error.message);
  }
}

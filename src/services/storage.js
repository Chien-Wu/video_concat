import fs from 'fs/promises';
import path from 'path';
import { STORAGE_CONFIG } from '../config/constants.js';

/**
 * Schedule video file deletion after retention period
 * @param {string} videoPath - Path to video file
 * @param {string} jobId - Job identifier (for cleanup of temp files too)
 */
export function scheduleVideoDeletion(videoPath, jobId) {
  const retentionMs = STORAGE_CONFIG.RETENTION_HOURS * 60 * 60 * 1000;

  setTimeout(async () => {
    try {
      // Delete video file
      await fs.unlink(videoPath);
      console.log(`[Storage] Deleted video: ${videoPath}`);

      // Also cleanup temp directory
      const tmpDir = path.join(STORAGE_CONFIG.TMP_DIR, jobId);
      await fs.rm(tmpDir, { recursive: true, force: true });
      console.log(`[Storage] Cleaned up temp files for job: ${jobId}`);
    } catch (error) {
      console.error(`[Storage] Failed to delete files for job ${jobId}:`, error.message);
    }
  }, retentionMs);

  const expiresAt = new Date(Date.now() + retentionMs);
  console.log(`[Storage] Scheduled deletion of ${videoPath} at ${expiresAt.toISOString()}`);

  return expiresAt;
}

/**
 * Ensure required directories exist
 */
export async function ensureDirectories() {
  await fs.mkdir(STORAGE_CONFIG.VIDEOS_DIR, { recursive: true });
  await fs.mkdir(STORAGE_CONFIG.TMP_DIR, { recursive: true });
  console.log('[Storage] Directories initialized');
}

/**
 * Get video URL for a job
 */
export function getVideoUrl(jobId) {
  const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
  return `${publicUrl}/videos/${jobId}.mp4`;
}

/**
 * Cleanup old tmp directories (for failed jobs)
 * Should be called periodically via cron
 */
export async function cleanupOldTempDirectories(maxAgeHours = 1) {
  try {
    const tmpDir = STORAGE_CONFIG.TMP_DIR;
    const entries = await fs.readdir(tmpDir, { withFileTypes: true });

    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    let cleaned = 0;

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(tmpDir, entry.name);
        const stats = await fs.stat(dirPath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          await fs.rm(dirPath, { recursive: true, force: true });
          console.log(`[Storage] Cleaned up old tmp directory: ${entry.name} (${(age / 3600000).toFixed(1)}h old)`);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      console.log(`[Storage] Cleaned up ${cleaned} old tmp directories`);
    }
  } catch (error) {
    console.error('[Storage] Error cleaning up tmp directories:', error.message);
  }
}

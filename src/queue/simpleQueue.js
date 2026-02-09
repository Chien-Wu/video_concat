import pLimit from 'p-limit';
import { QUEUE_CONFIG } from '../config/constants.js';

/**
 * Simple in-memory queue using p-limit
 * Suitable for 2-3 concurrent jobs without Redis dependency
 */

// Limit concurrent jobs
const limit = pLimit(QUEUE_CONFIG.MAX_CONCURRENT);

// Job storage (in-memory)
const jobs = new Map();

/**
 * Job status enum
 */
export const JobStatus = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Add a job to the queue
 * @param {string} jobId - Unique job identifier
 * @param {Function} task - Async function to execute
 * @returns {void}
 */
export function addJob(jobId, task) {
  // Initialize job status
  jobs.set(jobId, {
    status: JobStatus.QUEUED,
    progress: 0,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    error: null,
    videoUrl: null,
    duration: null
  });

  // Execute task with concurrency limit
  limit(async () => {
    try {
      // Update status to processing
      const job = jobs.get(jobId);
      job.status = JobStatus.PROCESSING;
      job.startedAt = new Date();
      jobs.set(jobId, job);

      console.log(`[Queue] Started processing job ${jobId}`);

      // Execute task with progress callback
      const result = await task((progressData) => {
        const currentJob = jobs.get(jobId);
        if (currentJob) {
          currentJob.progress = progressData.progress || 0;
          currentJob.stage = progressData.stage;
          jobs.set(jobId, currentJob);
        }
      });

      // Update status to completed
      const completedJob = jobs.get(jobId);
      completedJob.status = JobStatus.COMPLETED;
      completedJob.progress = 100;
      completedJob.completedAt = new Date();
      completedJob.videoUrl = result.videoUrl;
      completedJob.duration = result.duration;
      jobs.set(jobId, completedJob);

      console.log(`[Queue] Completed job ${jobId}`);
    } catch (error) {
      console.error(`[Queue] Job ${jobId} failed:`, error.message);

      // Update status to failed
      const failedJob = jobs.get(jobId);
      failedJob.status = JobStatus.FAILED;
      failedJob.completedAt = new Date();
      failedJob.error = error.message;
      jobs.set(jobId, failedJob);
    }
  });
}

/**
 * Get job status
 * @param {string} jobId - Job identifier
 * @returns {Object|null} Job status or null if not found
 */
export function getJobStatus(jobId) {
  const job = jobs.get(jobId);

  if (!job) {
    return null;
  }

  // Calculate estimated time remaining (simple heuristic)
  let estimatedTimeRemaining = null;
  if (job.status === JobStatus.PROCESSING && job.progress > 10) {
    const elapsed = Date.now() - job.startedAt.getTime();
    const totalEstimated = (elapsed / job.progress) * 100;
    estimatedTimeRemaining = Math.round((totalEstimated - elapsed) / 1000); // in seconds
  }

  return {
    jobId,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error,
    videoUrl: job.videoUrl,
    duration: job.duration,
    estimatedTimeRemaining
  };
}

/**
 * Get all jobs (for debugging)
 */
export function getAllJobs() {
  return Array.from(jobs.entries()).map(([id, job]) => ({
    jobId: id,
    ...job
  }));
}

/**
 * Clean up old completed/failed jobs (prevent memory leak)
 * Call this periodically
 */
export function cleanupOldJobs(maxAgeHours = 24) {
  const now = Date.now();
  const maxAge = maxAgeHours * 60 * 60 * 1000;

  for (const [jobId, job] of jobs.entries()) {
    if (job.completedAt) {
      const age = now - job.completedAt.getTime();
      if (age > maxAge) {
        jobs.delete(jobId);
        console.log(`[Queue] Cleaned up old job ${jobId}`);
      }
    }
  }
}

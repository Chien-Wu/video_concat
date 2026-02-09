import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';

import { validateGenerateRequest } from './utils/validation.js';
import { generateSpeechWithTimestamps } from './services/elevenlabs.js';
import { downloadImages, cleanupTempFiles } from './services/imageDownloader.js';
import { smartSegmentSubtitles, validateAlignment } from './utils/alignment.js';
import { renderVideo } from './services/renderer.js';
import { ensureDirectories, scheduleVideoDeletion, getVideoUrl, cleanupOldTempDirectories } from './services/storage.js';
import { addJob, getJobStatus, cleanupOldJobs, getAllJobs } from './queue/simpleQueue.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static video files
app.use('/videos', express.static('public/videos'));

// Serve temporary files (for Remotion to access during rendering)
app.use('/tmp', express.static('tmp'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/generate
 * Generate video from images and text
 */
app.post('/api/generate', async (req, res) => {
  try {
    // Validate request
    const validation = validateGenerateRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    const { images, text } = req.body;
    const jobId = uuidv4();

    console.log(`[API] New video generation request: ${jobId}`);

    // Add job to queue
    addJob(jobId, async (onProgress) => {
      try {
        // Step 1: Generate speech with timestamps
        onProgress({ stage: 'speech_generation', progress: 5 });
        console.log(`[Job ${jobId}] Generating speech...`);

        const { audioPath, alignment, duration } = await generateSpeechWithTimestamps(text, jobId);

        onProgress({ stage: 'speech_generation', progress: 20 });
        console.log(`[Job ${jobId}] Speech generated: ${duration}s`);

        // Step 2: Process subtitle alignment
        validateAlignment(alignment);
        const subtitles = smartSegmentSubtitles(alignment);

        console.log(`[Job ${jobId}] Generated ${subtitles.length} subtitle segments`);

        // Step 3: Download images
        onProgress({ stage: 'downloading_images', progress: 25 });
        console.log(`[Job ${jobId}] Downloading images...`);

        const localImagePaths = await downloadImages(images, jobId);

        onProgress({ stage: 'downloading_images', progress: 35 });
        console.log(`[Job ${jobId}] Images downloaded`);

        // Step 4: Render video
        onProgress({ stage: 'rendering', progress: 40 });
        console.log(`[Job ${jobId}] Starting video render...`);

        const videoPath = await renderVideo(
          {
            images: localImagePaths,
            audioPath,
            duration,
            subtitles
          },
          jobId,
          onProgress
        );

        console.log(`[Job ${jobId}] Video rendered: ${videoPath}`);

        // Step 5: Schedule cleanup
        const expiresAt = scheduleVideoDeletion(videoPath, jobId);

        // Step 6: Cleanup temp files immediately (keep only final video)
        await cleanupTempFiles(jobId);

        return {
          videoUrl: getVideoUrl(jobId),
          duration,
          expiresAt
        };
      } catch (error) {
        console.error(`[Job ${jobId}] Error:`, error);

        // Cleanup temp files even on failure
        try {
          await cleanupTempFiles(jobId);
          console.log(`[Job ${jobId}] Cleaned up temp files after failure`);
        } catch (cleanupError) {
          console.error(`[Job ${jobId}] Failed to cleanup temp files:`, cleanupError.message);
        }

        throw error;
      }
    });

    // Return job ID immediately
    res.status(202).json({
      jobId,
      status: 'processing',
      message: 'Video generation started',
      statusUrl: `/api/status/${jobId}`
    });
  } catch (error) {
    console.error('[API] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/status/:jobId
 * Get job status
 */
app.get('/api/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const status = getJobStatus(jobId);

  if (!status) {
    return res.status(404).json({
      error: 'Job not found',
      jobId
    });
  }

  res.json(status);
});

/**
 * GET /api/jobs
 * Get all jobs (debugging endpoint)
 */
app.get('/api/jobs', (req, res) => {
  res.json(getAllJobs());
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server] Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Initialize and start server
async function start() {
  try {
    // Ensure directories exist
    await ensureDirectories();

    // Setup cron jobs
    // Cleanup old job records every hour
    cron.schedule('0 * * * *', () => {
      console.log('[Cron] Cleaning up old job records...');
      cleanupOldJobs(24);
    });

    // Cleanup old tmp directories every hour
    cron.schedule('0 * * * *', async () => {
      console.log('[Cron] Cleaning up old tmp directories...');
      await cleanupOldTempDirectories(1); // Delete tmp folders older than 1 hour
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   Video Generator Server Started      ║
╠════════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(33)}║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(24)}║
║  Max Concurrent: ${(process.env.MAX_CONCURRENT_JOBS || '2').padEnd(21)}║
╚════════════════════════════════════════╝

Endpoints:
  POST   /api/generate     - Generate video
  GET    /api/status/:id   - Get job status
  GET    /videos/:id.mp4   - Download video
  GET    /health           - Health check
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

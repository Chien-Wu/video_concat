import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { fileURLToPath } from 'url';
import { VIDEO_CONFIG, STORAGE_CONFIG } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Render video using Remotion
 * @param {Object} options - Rendering options
 * @param {string[]} options.images - Local image paths
 * @param {string} options.audioPath - Local audio file path
 * @param {number} options.duration - Video duration in seconds
 * @param {Array} options.subtitles - Subtitle data
 * @param {string} jobId - Unique job identifier
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string>} Path to rendered video
 */
export async function renderVideo(options, jobId, onProgress) {
  const { images, audioPath, duration, subtitles } = options;

  try {
    // Step 1: Bundle Remotion project
    onProgress?.({ stage: 'bundling', progress: 10 });

    const remotionRoot = path.join(__dirname, '..', 'remotion', 'Root.jsx');
    const bundleLocation = await bundle({
      entryPoint: remotionRoot,
      webpackOverride: (config) => config
    });

    onProgress?.({ stage: 'bundling', progress: 30 });

    // Step 2: Prepare HTTP URLs for assets
    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3000';

    // Convert local file paths to HTTP URLs
    const imageUrls = images.map(imgPath => {
      return `${publicUrl}/${imgPath}`;
    });

    const audioUrl = `${publicUrl}/${audioPath}`;

    // Step 3: Select composition
    const totalFrames = Math.ceil(duration * VIDEO_CONFIG.FPS);

    const inputProps = {
      images: imageUrls,
      audioUrl: audioUrl,
      totalFrames,
      subtitles
    };

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'VideoGeneration',
      inputProps
    });

    onProgress?.({ stage: 'rendering', progress: 40 });

    // Step 3: Render video
    const outputPath = path.join(
      STORAGE_CONFIG.VIDEOS_DIR,
      `${jobId}.mp4`
    );

    await renderMedia({
      composition: {
        ...composition,
        durationInFrames: totalFrames,
        fps: VIDEO_CONFIG.FPS,
        width: VIDEO_CONFIG.WIDTH,
        height: VIDEO_CONFIG.HEIGHT
      },
      serveUrl: bundleLocation,
      codec: VIDEO_CONFIG.CODEC,
      outputLocation: outputPath,
      inputProps,
      onProgress: ({ progress }) => {
        const renderProgress = 40 + Math.floor(progress * 50);
        onProgress?.({ stage: 'rendering', progress: renderProgress });
      }
    });

    onProgress?.({ stage: 'completed', progress: 100 });

    return outputPath;
  } catch (error) {
    throw new Error(`Rendering failed: ${error.message}`);
  }
}

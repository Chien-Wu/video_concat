import fs from 'fs/promises';
import path from 'path';
import { API_CONFIG, STORAGE_CONFIG } from '../config/constants.js';

/**
 * Generate speech with character-level timestamps using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {string} jobId - Unique job identifier
 * @returns {Promise<{audioPath: string, alignment: Object, duration: number}>}
 */
export async function generateSpeechWithTimestamps(text, jobId) {
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!voiceId || !apiKey) {
    throw new Error('ElevenLabs API key or Voice ID not configured');
  }

  const url = `${API_CONFIG.ELEVENLABS.BASE_URL}/text-to-speech/${voiceId}/with-timestamps`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: API_CONFIG.ELEVENLABS.MODEL_ID
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Save audio file
    const tmpDir = path.join(STORAGE_CONFIG.TMP_DIR, jobId);
    await fs.mkdir(tmpDir, { recursive: true });

    const audioPath = path.join(tmpDir, 'audio.mp3');
    const audioBuffer = Buffer.from(data.audio_base64, 'base64');
    await fs.writeFile(audioPath, audioBuffer);

    // Calculate audio duration from alignment
    const alignment = data.alignment;
    const duration = alignment.character_end_times_seconds[
      alignment.character_end_times_seconds.length - 1
    ];

    return {
      audioPath,
      alignment,
      duration
    };
  } catch (error) {
    throw new Error(`Failed to generate speech: ${error.message}`);
  }
}

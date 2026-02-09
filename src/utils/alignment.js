import { VIDEO_CONFIG } from '../config/constants.js';

/**
 * Smart subtitle segmentation based on ElevenLabs character-level alignment
 * This algorithm iterates through the alignment data and creates subtitle segments
 * based on punctuation, pauses, and maximum length constraints.
 *
 * @param {Object} alignment - ElevenLabs alignment object
 * @param {string[]} alignment.characters - Array of characters
 * @param {number[]} alignment.character_start_times_seconds - Start times for each character
 * @param {number[]} alignment.character_end_times_seconds - End times for each character
 * @returns {Array<{text: string, startTime: number, endTime: number}>}
 */
export function smartSegmentSubtitles(alignment) {
  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment;

  const phrases = [];
  let currentPhrase = {
    text: '',
    start: character_start_times_seconds[0],
    end: 0
  };

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const start = character_start_times_seconds[i];
    const end = character_end_times_seconds[i];

    // Initialize start time if this is the first character of a new phrase
    if (currentPhrase.text.length === 0) {
      currentPhrase.start = start;
    }

    currentPhrase.text += char;
    currentPhrase.end = end;

    // Determine if we should end the current subtitle segment
    const nextStart = character_start_times_seconds[i + 1];

    // Check for pause (silence gap between characters)
    const isPause = nextStart && (nextStart - end > VIDEO_CONFIG.ALIGNMENT.PAUSE_THRESHOLD);

    // Check for punctuation marks (expanded to include : and —)
    const isPunctuation = /[。！？.!?,;，；:：—\-]/.test(char);

    // Check if subtitle is getting too long
    const isTooLong = currentPhrase.text.length >= VIDEO_CONFIG.SUBTITLE.MAX_CHARS_PER_LINE;

    // Check if this is the last character
    const isLastChar = i === characters.length - 1;

    // Only break on pause or punctuation (prioritize natural breaks)
    // For long lines, wait for next natural break
    const shouldBreak = isLastChar ||
                       (isPause && currentPhrase.text.length > 0) ||
                       (isPunctuation && currentPhrase.text.length > 10);

    if (shouldBreak) {
      // Only add if the subtitle has meaningful content
      const trimmedText = currentPhrase.text.trim();
      const duration = currentPhrase.end - currentPhrase.start;

      if (trimmedText.length > 0 && duration >= VIDEO_CONFIG.ALIGNMENT.MIN_SUBTITLE_DURATION) {
        phrases.push({
          text: trimmedText,
          startTime: currentPhrase.start,
          endTime: currentPhrase.end
        });

        // Debug logging (can be removed in production)
        console.log(`[Subtitle ${phrases.length}] "${trimmedText.substring(0, 50)}..." (${duration.toFixed(2)}s)`);
      }

      // Start a new phrase - reset text but keep proper timing
      currentPhrase = { text: '', start: 0, end: 0 };
    }
  }

  console.log(`[Alignment] Generated ${phrases.length} subtitle segments`);
  return phrases;
}

/**
 * Validate alignment data structure
 */
export function validateAlignment(alignment) {
  if (!alignment || typeof alignment !== 'object') {
    throw new Error('Invalid alignment: must be an object');
  }

  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment;

  if (!Array.isArray(characters) || characters.length === 0) {
    throw new Error('Invalid alignment: characters must be a non-empty array');
  }

  if (!Array.isArray(character_start_times_seconds) ||
      character_start_times_seconds.length !== characters.length) {
    throw new Error('Invalid alignment: character_start_times_seconds length mismatch');
  }

  if (!Array.isArray(character_end_times_seconds) ||
      character_end_times_seconds.length !== characters.length) {
    throw new Error('Invalid alignment: character_end_times_seconds length mismatch');
  }

  return true;
}

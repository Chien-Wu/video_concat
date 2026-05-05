import React from 'react';
import { useCurrentFrame, useVideoConfig, Img } from 'remotion';
import { VIDEO_CONFIG } from '../config/constants.js';

/**
 * Talking avatar anchored to the letterboxed image's bottom-left.
 * Mouth animates only while a subtitle window is active (proxy for speech).
 */
export const Avatar = ({ closedUrl, openUrl, subtitles }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const config = VIDEO_CONFIG.AVATAR;

  // Compute where the letterboxed image sits.
  // Image is centered, fitted to width, so its height = width / aspectRatio.
  // Letterbox bars top & bottom each = (frameHeight - imageHeight) / 2.
  const imageHeight = width / VIDEO_CONFIG.IMAGE.ASPECT_RATIO;
  const letterboxBottom = (height - imageHeight) / 2;

  // Image's left edge is at x=0 (image fills frame width).
  const left = 0 + config.INSET_LEFT;
  // Image's bottom edge is at y = letterboxBottom (from frame bottom).
  const bottom = letterboxBottom + config.INSET_BOTTOM;

  const t = frame / fps;
  const isSpeaking = subtitles.some((s) => t >= s.startTime && t < s.endTime);
  const mouthOpen =
    isSpeaking && Math.floor(frame / config.TOGGLE_EVERY_FRAMES) % 2 === 1;

  return (
    <Img
      src={mouthOpen ? openUrl : closedUrl}
      style={{
        position: 'absolute',
        left,
        bottom,
        width: config.SIZE,
        height: config.SIZE,
        objectFit: 'contain',
        filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))',
      }}
    />
  );
};

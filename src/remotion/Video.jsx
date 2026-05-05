import React from 'react';
import { Audio, Sequence, useVideoConfig } from 'remotion';
import { ImageSlide } from './ImageSlide.jsx';
import { Subtitle } from './Subtitle.jsx';
import { Avatar } from './Avatar.jsx';
import { VIDEO_CONFIG } from '../config/constants.js';

/**
 * Main video composition
 * Combines images, audio, and subtitles with precise timing
 */
export const Video = ({ images, audioUrl, totalFrames, subtitles, avatar }) => {
  const { fps } = useVideoConfig();

  // Calculate frame distribution for 8 images
  // First 7 images get equal duration, last image takes remaining frames
  const framesPerImage = Math.floor(totalFrames / 8);
  const lastImageFrames = totalFrames - (framesPerImage * 7);

  return (
    <>
      {/* Background audio */}
      <Audio src={audioUrl} />

      {/* 8 images with calculated durations */}
      {images.map((imageUrl, index) => {
        const from = index * framesPerImage;
        const duration = index === 7 ? lastImageFrames : framesPerImage;

        return (
          <Sequence key={`image-${index}`} from={from} durationInFrames={duration}>
            <ImageSlide src={imageUrl} />
          </Sequence>
        );
      })}

      {/* Subtitles synchronized with speech */}
      {subtitles.map((subtitle, index) => {
        const from = Math.floor(subtitle.startTime * fps);
        // Use Math.ceil and ensure minimum 1 frame for very short words
        const duration = Math.max(1, Math.ceil((subtitle.endTime - subtitle.startTime) * fps));

        return (
          <Sequence key={`subtitle-${index}`} from={from} durationInFrames={duration}>
            <Subtitle text={subtitle.text} />
          </Sequence>
        );
      })}

      {/* Talking avatar in bottom-left */}
      {VIDEO_CONFIG.AVATAR.ENABLED && avatar?.closedUrl && avatar?.openUrl && (
        <Avatar
          closedUrl={avatar.closedUrl}
          openUrl={avatar.openUrl}
          subtitles={subtitles}
        />
      )}
    </>
  );
};

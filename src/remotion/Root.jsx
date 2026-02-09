import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { Video } from './Video.jsx';
import { VIDEO_CONFIG } from '../config/constants.js';

/**
 * Remotion root component
 * Defines the video composition with dynamic props
 */
export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="VideoGeneration"
        component={Video}
        durationInFrames={300} // Will be overridden dynamically
        fps={VIDEO_CONFIG.FPS}
        width={VIDEO_CONFIG.WIDTH}
        height={VIDEO_CONFIG.HEIGHT}
        defaultProps={{
          images: [],
          audioUrl: '',
          totalFrames: 300,
          subtitles: []
        }}
      />
    </>
  );
};

// Register the root component
registerRoot(RemotionRoot);

import React from 'react';
import { useCurrentFrame, useVideoConfig, Img } from 'remotion';
import { getTransition } from './transitions.js';
import { VIDEO_CONFIG } from '../config/constants.js';

/**
 * Image slide component with customizable transitions
 */
export const ImageSlide = ({ src }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // Get transition effect from config
  const transitionFn = getTransition(VIDEO_CONFIG.TRANSITION.TYPE);
  const transitionStyle = transitionFn(frame, durationInFrames, fps);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
        ...transitionStyle
      }}
    >
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
    </div>
  );
};

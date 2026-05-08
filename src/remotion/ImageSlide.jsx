import React from 'react';
import { useCurrentFrame, useVideoConfig, Img } from 'remotion';
import { getTransition } from './transitions.js';
import { VIDEO_CONFIG } from '../config/constants.js';

/**
 * Image slide component with customizable transitions.
 *
 * The image is rendered inside a fixed-size letterbox window with
 * overflow:hidden, so scaling transforms (e.g. Ken Burns zoom) zoom the
 * image WITHIN that window — the visible area never grows beyond the
 * letterbox bounds.
 */
export const ImageSlide = ({ src }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();

  const transitionFn = getTransition(VIDEO_CONFIG.TRANSITION.TYPE);
  const transitionStyle = transitionFn(frame, durationInFrames, fps);

  // Split: opacity stays on the outer (so fade affects the whole slide
  // including the black letterbox bars). Everything else (transform) goes
  // on the image so it's clipped to the letterbox window.
  const { opacity, ...imgStyle } = transitionStyle;

  // Letterbox window for a horizontal image fitted to frame width.
  const imageHeight = width / VIDEO_CONFIG.IMAGE.ASPECT_RATIO;
  const top = (height - imageHeight) / 2;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: VIDEO_CONFIG.IMAGE.BACKGROUND_COLOR,
        opacity,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top,
          left: 0,
          width,
          height: imageHeight,
          overflow: 'hidden',
        }}
      >
        <Img
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            ...imgStyle,
          }}
        />
      </div>
    </div>
  );
};

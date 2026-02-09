import { interpolate, spring } from 'remotion';

/**
 * Transition effects for image slides
 * Easily customizable and extensible
 */

/**
 * Fade transition
 */
export function fadeTransition(frame, durationInFrames, fps) {
  const fadeInDuration = Math.min(10, durationInFrames / 4);
  const fadeOutDuration = Math.min(10, durationInFrames / 4);

  const opacity = interpolate(
    frame,
    [0, fadeInDuration, durationInFrames - fadeOutDuration, durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  return { opacity };
}

/**
 * Slide transition (from right)
 */
export function slideTransition(frame, durationInFrames, fps) {
  const slideDuration = Math.min(15, durationInFrames / 3);

  const translateX = interpolate(
    frame,
    [0, slideDuration],
    [100, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  const opacity = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  return {
    transform: `translateX(${translateX}%)`,
    opacity
  };
}

/**
 * Zoom transition (Ken Burns effect)
 */
export function zoomTransition(frame, durationInFrames, fps) {
  const scale = interpolate(
    frame,
    [0, durationInFrames],
    [1, 1.1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  const opacity = interpolate(
    frame,
    [0, 10, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  return {
    transform: `scale(${scale})`,
    opacity
  };
}

/**
 * Spring transition (bouncy entrance)
 */
export function springTransition(frame, durationInFrames, fps) {
  const scale = spring({
    frame,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
      mass: 1
    }
  });

  const opacity = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  return {
    transform: `scale(${scale})`,
    opacity
  };
}

/**
 * Get transition function by name
 */
export function getTransition(name) {
  const transitions = {
    fade: fadeTransition,
    slide: slideTransition,
    zoom: zoomTransition,
    spring: springTransition
  };

  return transitions[name] || fadeTransition;
}

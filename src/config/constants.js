export const VIDEO_CONFIG = {
  // Video specifications
  WIDTH: 1080,
  HEIGHT: 1920,
  FPS: 30,
  CODEC: "h264",

  // Image settings
  IMAGE_COUNT: 8,

  // Transition settings (easily changeable)
  TRANSITION: {
    TYPE: "zoom", // Options: 'fade', 'slide', 'zoom' - zoom creates Ken Burns effect
    DURATION_FRAMES: 10,
  },

  // Subtitle settings (easily changeable)
  SUBTITLE: {
    FONT_SIZE: 90,
    COLOR: "#FFFFFF",
    STROKE_COLOR: "#000000",
    STROKE_WIDTH: 3,
    POSITION: "bottom", // Options: 'top', 'center', 'bottom'
    MARGIN_BOTTOM: 300,
    PADDING_HORIZONTAL: 40,
    MAX_CHARS_PER_LINE: 80, // Increased from 20 to avoid losing text
  },

  // Alignment settings
  ALIGNMENT: {
    PAUSE_THRESHOLD: 0.3, // Seconds of silence to trigger new subtitle
    MIN_SUBTITLE_DURATION: 0.5, // Minimum subtitle display time
  },
};

export const API_CONFIG = {
  ELEVENLABS: {
    BASE_URL: "https://api.elevenlabs.io/v1",
    MODEL_ID: "eleven_multilingual_v2",
  },
};

export const STORAGE_CONFIG = {
  RETENTION_HOURS: parseInt(process.env.VIDEO_RETENTION_HOURS || "24"),
  VIDEOS_DIR: "public/videos",
  TMP_DIR: "tmp",
};

export const QUEUE_CONFIG = {
  MAX_CONCURRENT: parseInt(process.env.MAX_CONCURRENT_JOBS || "2"),
};

export const VIDEO_CONFIG = {
  // Video specifications
  WIDTH: 1080,
  HEIGHT: 1920,
  FPS: 30,
  CODEC: "h264",

  // Image settings
  IMAGE_COUNT: 8,
  IMAGE: {
    // Source images are horizontal; we letterbox them onto a black frame.
    // Set the aspect ratio (width/height) used to compute where the image's
    // bottom edge lands so the avatar can be anchored to it.
    // Current source: 1072x864 ≈ 1.2407
    ASPECT_RATIO: 1072 / 864,
    BACKGROUND_COLOR: "#000000",
  },

  // Transition settings (easily changeable)
  TRANSITION: {
    TYPE: "zoom", // Options: 'fade', 'slide', 'zoom' - zoom creates Ken Burns effect
    DURATION_FRAMES: 10,
  },

  // Subtitle settings (easily changeable)
  SUBTITLE: {
    MODE: "word-by-word", // Options: "phrase", "word-by-word", "sentence"
    FONT_SIZE: 140,
    FONT_WEIGHT: 900, // 100-900 (400=normal, 700=bold, 900=black)
    COLOR: "#FFFFFF",
    STROKE_COLOR: "#000000",
    STROKE_WIDTH: 4,
    POSITION: "bottom", // Options: 'top', 'center', 'bottom'
    MARGIN_BOTTOM: 300,
    PADDING_HORIZONTAL: 40,
    MAX_CHARS_PER_LINE: 80, // Used in phrase mode only
  },

  // Alignment settings
  ALIGNMENT: {
    PAUSE_THRESHOLD: 0.3, // Seconds of silence to trigger new subtitle
    MIN_SUBTITLE_DURATION: 0.5, // Minimum subtitle display time
  },

  // Avatar settings (talking character anchored to image's bottom-left)
  AVATAR: {
    ENABLED: true,
    SIZE: 420, // px, square
    INSET_LEFT: 20, // px from image's left edge
    INSET_BOTTOM: 0, // px above image's bottom edge (negative = below)
    TOGGLE_EVERY_FRAMES: 4, // ~7.5Hz at 30fps, matches syllable rate
    CLOSED_FILE: "alexander_closed.png",
    OPEN_FILE: "alexander_open.png",
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

export const VOICE_CONFIG = {
  // Voice settings (easily changeable)
  SPEED: 1.0, // 0.7 to 1.2 (1.0 = normal, 1.1 = 10% faster)
  STABILITY: 0.5, // 0 to 1 (lower = more expressive, higher = more stable)
  SIMILARITY_BOOST: 0.75, // 0 to 1 (controls voice consistency)
  STYLE: 0, // 0 to 1 (lower = more natural, higher = more exaggerated)
  USE_SPEAKER_BOOST: true, // Enhance clarity
};

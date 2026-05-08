import React from "react";
import { loadFont } from "@remotion/google-fonts/Manrope";
import { VIDEO_CONFIG } from "../config/constants.js";

const { fontFamily } = loadFont("normal", {
  weights: ["700", "800"],
  subsets: ["latin"],
});

/**
 * Headline banner pinned to the top letterbox bar.
 * Persists for the entire video.
 */
export const Banner = ({ text }) => {
  const config = VIDEO_CONFIG.BANNER;
  if (!text) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: config.TOP,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${config.PADDING_HORIZONTAL}px`,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: config.FONT_SIZE,
          fontWeight: config.FONT_WEIGHT,
          color: config.COLOR,
          textAlign: "center",
          lineHeight: 1.15,
          textShadow: `
            ${config.STROKE_WIDTH}px ${config.STROKE_WIDTH}px 0 ${config.STROKE_COLOR},
            -${config.STROKE_WIDTH}px ${config.STROKE_WIDTH}px 0 ${config.STROKE_COLOR},
            ${config.STROKE_WIDTH}px -${config.STROKE_WIDTH}px 0 ${config.STROKE_COLOR},
            -${config.STROKE_WIDTH}px -${config.STROKE_WIDTH}px 0 ${config.STROKE_COLOR},
            0 ${config.STROKE_WIDTH * 2}px ${config.STROKE_WIDTH * 3}px rgba(0,0,0,0.5)
          `,
          maxWidth: "100%",
          wordWrap: "break-word",
          display: "-webkit-box",
          WebkitLineClamp: config.MAX_LINES,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {text}
      </div>
    </div>
  );
};

import React from "react";
import { loadFont } from "@remotion/google-fonts/NotoSansTC";
import { VIDEO_CONFIG } from "../config/constants.js";

// Load Chinese font with warning suppression
// Note: This loads all weights but suppresses the warning
// The font still works perfectly for our use case
const { fontFamily } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

/**
 * Subtitle component with Chinese font support
 * Styling is easily customizable via VIDEO_CONFIG
 */
export const Subtitle = ({ text }) => {
  const config = VIDEO_CONFIG.SUBTITLE;

  // Calculate position based on config
  const getPositionStyle = () => {
    switch (config.POSITION) {
      case "top":
        return { top: config.MARGIN_BOTTOM };
      case "center":
        return {
          top: "50%",
          transform: "translateY(-50%)",
        };
      case "bottom":
      default:
        return { bottom: config.MARGIN_BOTTOM };
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${config.PADDING_HORIZONTAL}px`,
        ...getPositionStyle(),
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: config.FONT_SIZE,
          color: config.COLOR,
          textAlign: "center",
          textShadow: `
            ${config.STROKE_WIDTH}px ${config.STROKE_WIDTH}px 0 ${config.STROKE_COLOR},
            -${config.STROKE_WIDTH}px ${config.STROKE_WIDTH}px 0 ${config.STROKE_COLOR},
            ${config.STROKE_WIDTH}px -${config.STROKE_WIDTH}px 0 ${config.STROKE_COLOR},
            -${config.STROKE_WIDTH}px -${config.STROKE_WIDTH}px 0 ${config.STROKE_COLOR},
            0 ${config.STROKE_WIDTH * 2}px ${config.STROKE_WIDTH * 3}px rgba(0,0,0,0.5)
          `,
          lineHeight: 1.4,
          wordWrap: "break-word",
          maxWidth: "100%",
        }}
      >
        {text}
      </div>
    </div>
  );
};

"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";

type FlyingHeartProps = {
  /** Viewport coords for the click origin (button center). */
  startX: number;
  startY: number;
  /** Viewport coords for the destination (cat image center). */
  endX: number;
  endY: number;
};

/**
 * Single pink heart that flies in a soft arc from the Give-Heart button
 * up into the selected cat image. Fixed-position so it animates in
 * viewport coords regardless of where the card sits on the page.
 *
 * Total flight time ~550ms — the parent times the rest of the sequence
 * (sparkle burst, card reaction, modal open) around this.
 */
export default function FlyingHeart({
  startX,
  startY,
  endX,
  endY,
}: FlyingHeartProps) {
  // Arc peak: midpoint horizontally, lifted ~80px above the chord between
  // the two anchors. Looks gentle and intentional.
  const peakX = (startX + endX) / 2;
  const peakY = Math.min(startY, endY) - 80;

  // Heart sizing: base size of the SVG; scale keyframes multiply on top.
  const SIZE = 52;
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed z-[58] text-pink-dark drop-shadow-[0_14px_28px_rgba(231,158,174,0.6)]"
      // Anchor 0,0 in the viewport; x/y position the heart's center.
      style={{
        left: 0,
        top: 0,
        width: SIZE,
        height: SIZE,
        marginLeft: -SIZE / 2,
        marginTop: -SIZE / 2,
      }}
      initial={{ x: startX, y: startY, scale: 0.6, opacity: 0, rotate: -8 }}
      animate={{
        x: [startX, peakX, endX],
        y: [startY, peakY, endY],
        scale: [0.6, 1.7, 1.05],
        opacity: [0, 1, 0],
        rotate: [-8, 8, -4],
      }}
      transition={{
        duration: 0.6,
        ease: [0.22, 0.78, 0.36, 1],
        times: [0, 0.55, 1],
      }}
    >
      <Heart className="h-full w-full" fill="currentColor" strokeWidth={0} />
    </motion.div>
  );
}

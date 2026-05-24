"use client";

import { motion } from "framer-motion";

/**
 * Brief warm-pink glow that washes the screen when the flying heart
 * lands. Renders once per Give-Heart sequence — fades in, holds, fades
 * back out. Pointer-events-none so it never interrupts interaction.
 */
export default function ScreenPulse() {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[56]"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.55, 0] }}
      transition={{ duration: 0.65, delay: 0.4, ease: "easeOut" }}
      style={{
        background:
          "radial-gradient(circle at center, rgba(231, 158, 174, 0.45) 0%, rgba(231, 158, 174, 0.18) 35%, transparent 70%)",
      }}
    />
  );
}

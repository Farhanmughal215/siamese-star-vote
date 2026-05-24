"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMood } from "@/lib/mood";

/**
 * Time-aware café mood background.
 * - Layer 1: full-page mood gradient (crossfades as the hour changes)
 * - Layer 2: 3 drifting blurred glow blobs in mood colors
 *
 * Sits at z-[-30] so it's behind both the AmbientEffects layers and
 * the page content.
 */
export default function MoodBackground() {
  const { mood, pageGradient, glowColors } = useMood();
  const reduced = useReducedMotion();

  return (
    <>
      {/* 1. Mood gradient — crossfades on mood change */}
      <motion.div
        key={`grad-${mood}`}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{ backgroundImage: pageGradient }}
      />

      {/* 2. Drifting glow blobs — sized + blurred conservatively so the
             compositor doesn't melt on weaker devices. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-30 overflow-hidden"
      >
        <GlowBlob
          color={glowColors[0]}
          size={460}
          startX="-10%"
          startY="-14%"
          driftX={reduced ? 0 : 36}
          driftY={reduced ? 0 : 22}
          duration={42}
        />
        <GlowBlob
          color={glowColors[1]}
          size={420}
          startX="76%"
          startY="6%"
          driftX={reduced ? 0 : -28}
          driftY={reduced ? 0 : 44}
          duration={46}
        />
        <GlowBlob
          color={glowColors[2]}
          size={380}
          startX="34%"
          startY="74%"
          driftX={reduced ? 0 : 42}
          driftY={reduced ? 0 : -36}
          duration={50}
        />
      </div>
    </>
  );
}

// ---------- Glow blob ----------

function GlowBlob({
  color,
  size,
  startX,
  startY,
  driftX,
  driftY,
  duration,
}: {
  color: string;
  size: number;
  startX: string;
  startY: string;
  driftX: number;
  driftY: number;
  duration: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: startX,
        top: startY,
        // The radial gradient already gives a soft falloff. A heavy blur on
        // top of it is the single biggest GPU cost in the app — keep it small.
        background: `radial-gradient(closest-side, ${color}, transparent 70%)`,
        filter: "blur(28px)",
        // Hint the compositor that this element will animate transforms,
        // so it gets its own layer and doesn't repaint with the page.
        willChange: "transform",
      }}
      animate={{
        x: [0, driftX, -driftX * 0.5, 0],
        y: [0, driftY, -driftY * 0.3, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

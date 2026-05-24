"use client";

import { motion } from "framer-motion";
import { useMood } from "@/lib/mood";

/**
 * Small mood label rendered inline below the header. Switches copy and
 * emoji based on the time of day and crossfades on mood change.
 */
export default function MoodChip() {
  const { mood, label, emoji, accent } = useMood();

  return (
    <div className="relative mx-auto mt-3 flex max-w-7xl items-center justify-center px-4 sm:px-6">
      <motion.span
        key={mood}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="inline-flex items-center gap-1.5 rounded-full border border-brown/10 bg-white/65 px-3 py-1 text-[11px] font-semibold text-brown shadow-soft backdrop-blur sm:text-xs"
        style={{ boxShadow: `0 4px 18px -8px ${accent}` }}
      >
        <span aria-hidden="true" className="text-sm">
          {emoji}
        </span>
        <span>{label}</span>
      </motion.span>
    </div>
  );
}

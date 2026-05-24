"use client";

import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useSoundEnabled } from "@/lib/sound";

/**
 * Sound on/off toggle button. Lives in the GameHeader.
 * Persists to localStorage and surfaces the current state via icon.
 */
export default function SoundToggle() {
  const { enabled, toggle } = useSoundEnabled();

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.92 }}
      aria-label={enabled ? "Turn sound off" : "Turn sound on"}
      aria-pressed={enabled}
      title={enabled ? "Sound on" : "Sound off"}
      className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
        enabled
          ? "border-pink-dark/40 bg-pink-light/40 text-pink-dark shadow-soft"
          : "border-brown/15 bg-white/70 text-brown/60 hover:text-brown"
      }`}
    >
      {enabled ? (
        <Volume2 className="h-4 w-4" strokeWidth={2.4} />
      ) : (
        <VolumeX className="h-4 w-4" strokeWidth={2.4} />
      )}
      {/* Active dot */}
      {enabled && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-mint shadow-soft"
        />
      )}
    </motion.button>
  );
}

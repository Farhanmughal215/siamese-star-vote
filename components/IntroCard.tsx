"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export default function IntroCard() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative mx-auto mt-5 max-w-7xl px-4 sm:px-6"
      aria-label="Voting intro"
    >
      <div className="card-surface relative flex flex-col items-start gap-3 overflow-hidden rounded-3xl px-5 py-5 shadow-card sm:flex-row sm:items-center sm:gap-5 sm:px-7 sm:py-6">
        {/* Soft gradient overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-mint-light/40 via-transparent to-pink-light/35"
        />

        {/* Decorative pulsing heart */}
        <motion.div
          aria-hidden="true"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink to-pink-dark shadow-soft"
        >
          <Heart className="h-6 w-6 text-cream" strokeWidth={2.4} fill="currentColor" />
        </motion.div>

        <div className="relative flex-1">
          <h2 className="font-display text-xl font-bold leading-tight text-brown sm:text-2xl">
            Choose the next Cat Mayor
          </h2>
          <p className="mt-1 text-sm text-brown/70 sm:text-[15px]">
            Tap a cat, read their story, and give your daily heart.
          </p>
        </div>

        {/* Tiny right-side hint pill — desktop only */}
        <div className="relative hidden shrink-0 items-center gap-2 rounded-full border border-brown/10 bg-white/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-brown/70 shadow-sm sm:inline-flex">
          Live · Season 1
        </div>
      </div>
    </motion.section>
  );
}

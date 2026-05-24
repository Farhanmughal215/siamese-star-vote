"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

type CatDialogueBubbleProps = {
  /** The dialogue text to show. */
  text: string;
  /**
   * Visual variant.
   *  - "default" : larger text, used in modals (storybook profile).
   *  - "compact" : smaller text, for cards/lists.
   *  - "card"    : card-style with a tape strip — used in memory book.
   */
  variant?: "default" | "compact" | "card";
  /** Optional class to position the bubble. */
  className?: string;
};

/**
 * Reusable speech-bubble. Cream paper with a soft pink border + a small
 * tail at the bottom-left so it visually "belongs" to the cat above/left
 * of it. Stays small and decorative — never the primary action.
 */
export default function CatDialogueBubble({
  text,
  variant = "default",
  className = "",
}: CatDialogueBubbleProps) {
  const textSize =
    variant === "compact"
      ? "text-[12px]"
      : variant === "card"
        ? "text-[12.5px]"
        : "text-[13.5px]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className={`relative inline-block ${className}`}
    >
      <div
        className={`relative rounded-2xl border border-pink-dark/20 bg-cream/95 px-3 py-2 text-brown backdrop-blur ${textSize}`}
        style={{
          boxShadow:
            "0 6px 18px -6px rgba(90,49,20,0.18), inset 0 1px 0 rgba(255,255,255,0.65)",
        }}
      >
        <Quote
          className="absolute -left-1 -top-1 h-3 w-3 rotate-180 text-pink-dark/60"
          fill="currentColor"
          strokeWidth={0}
          aria-hidden="true"
        />
        <p className="relative leading-snug italic">{text}</p>
        {/* Bubble tail — small triangle pointing down-left */}
        <span
          aria-hidden="true"
          className="absolute -bottom-1.5 left-5 h-3 w-3 rotate-45 border-b border-r border-pink-dark/20 bg-cream"
        />
      </div>
    </motion.div>
  );
}

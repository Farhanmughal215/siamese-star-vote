"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Milestone } from "@/lib/visitorStats";

type MilestoneToastProps = {
  /** Queue of milestones to show, one after another. */
  queue: Milestone[];
  /** Called whenever the displayed milestone changes (so caller can pop it). */
  onDismiss: (milestoneId: string) => void;
  /** Auto-dismiss delay in ms (default 4500). */
  autoDismissMs?: number;
};

/**
 * Non-blocking toast that surfaces one milestone at a time from the queue.
 * Slides in from the top-right on desktop, top-center on mobile.
 *
 * The parent owns the queue and removes the front item once `onDismiss`
 * fires — either when the user closes manually or the auto timer expires.
 */
export default function MilestoneToast({
  queue,
  onDismiss,
  autoDismissMs = 4500,
}: MilestoneToastProps) {
  const current = queue[0] ?? null;
  const [shown, setShown] = useState<Milestone | null>(null);

  // When the front of the queue changes, snap to the new milestone.
  useEffect(() => {
    setShown(current);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss timer.
  useEffect(() => {
    if (!shown) return;
    const t = window.setTimeout(() => {
      onDismiss(shown.id);
    }, autoDismissMs);
    return () => window.clearTimeout(t);
  }, [shown, autoDismissMs, onDismiss]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-20 z-[55] flex justify-center px-4 sm:left-auto sm:right-6 sm:top-24 sm:justify-end sm:px-0"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {shown && (
          <motion.div
            key={shown.id}
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-3xl border border-brown/10 bg-cream shadow-card backdrop-blur"
          >
            {/* Brand gradient accent */}
            <div className="h-1 w-full bg-gradient-to-r from-mint via-pink to-pink-dark" />

            <div className="relative flex items-start gap-3 px-4 py-3.5">
              {/* Badge */}
              <motion.div
                className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink to-pink-dark text-2xl shadow-card"
                initial={{ scale: 0.6, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 14, delay: 0.05 }}
                aria-hidden="true"
              >
                <span>{shown.emoji}</span>

                {/* Tiny mint corner sparkle */}
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-mint shadow-soft">
                  <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-brown" aria-hidden="true">
                    <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
                  </svg>
                </span>
              </motion.div>

              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-1 rounded-full bg-pink/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-pink-dark">
                  Milestone Unlocked
                </p>
                <h3 className="mt-1 font-display text-sm font-bold leading-tight text-brown">
                  {shown.title}
                </h3>
                <p className="mt-0.5 text-[12px] leading-snug text-brown/65">
                  {shown.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(shown.id)}
                aria-label="Dismiss"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-brown/50 transition hover:bg-brown/10 hover:text-brown"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.4} />
              </button>
            </div>

            {/* Auto-dismiss progress strip */}
            <motion.div
              key={`bar-${shown.id}`}
              className="h-0.5 origin-left bg-gradient-to-r from-mint via-pink to-pink-dark"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: autoDismissMs / 1000, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

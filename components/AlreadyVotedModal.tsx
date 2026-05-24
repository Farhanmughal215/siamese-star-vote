"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Clock, Heart, X } from "lucide-react";
import { useEffect } from "react";
import CountdownTimer from "./CountdownTimer";

type AlreadyVotedModalProps = {
  open: boolean;
  /** Name of the cat the user already voted for today, if known. */
  catName?: string | null;
  /** Epoch ms — next time voting opens (= next local midnight). */
  nextVoteAt: number | null;
  onClose: () => void;
};

/**
 * Cozy "you already voted today" modal. Never frames the situation as an
 * error — it celebrates the previous vote and points at the next chance.
 */
export default function AlreadyVotedModal({
  open,
  catName,
  nextVoteAt,
  onClose,
}: AlreadyVotedModalProps) {
  // Body scroll lock + Escape to close.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="already-voted-root"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="already-voted-title"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-brown/45 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="relative z-10 w-full rounded-t-[28px] sm:max-w-[440px] sm:rounded-[28px]"
          >
            <div className="relative max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-t-[28px] bg-cream shadow-glass-inset scrollbar-none sm:rounded-[28px]">
              <div className="h-1.5 w-full bg-gradient-to-r from-mint via-pink to-pink-dark" />
              <div
                aria-hidden="true"
                className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-brown/15 sm:hidden"
              />

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-brown shadow-soft transition hover:bg-white"
              >
                <X className="h-4 w-4" strokeWidth={2.4} />
              </button>

              {/* Soft watermark */}
              <svg
                aria-hidden="true"
                viewBox="0 0 64 64"
                className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 text-pink/18"
              >
                <g fill="currentColor">
                  <ellipse cx="32" cy="42" rx="14" ry="11" />
                  <ellipse cx="14" cy="26" rx="6" ry="8" />
                  <ellipse cx="50" cy="26" rx="6" ry="8" />
                  <ellipse cx="22" cy="12" rx="5" ry="7" />
                  <ellipse cx="42" cy="12" rx="5" ry="7" />
                </g>
              </svg>

              <div className="relative px-6 pb-6 pt-7 text-center sm:px-8 sm:pb-8 sm:pt-9">
                {/* Pulsing heart */}
                <motion.div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink to-pink-dark shadow-card"
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{
                    duration: 2.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Heart
                    className="h-8 w-8 text-cream"
                    fill="currentColor"
                    strokeWidth={0}
                  />
                </motion.div>

                <p className="inline-flex items-center gap-1 rounded-full bg-mint/45 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-brown-400">
                  Daily Heart · Already Shared
                </p>

                <h2
                  id="already-voted-title"
                  className="mt-3 font-display text-2xl font-bold leading-tight text-brown sm:text-[26px]"
                >
                  You&apos;ve already shared today&apos;s heart 🐾
                </h2>

                <p className="mt-3 text-sm leading-relaxed text-brown/75">
                  {catName ? (
                    <>
                      Thank you for supporting{" "}
                      <span className="font-display font-bold text-pink-dark">
                        {catName}
                      </span>{" "}
                      today.
                    </>
                  ) : (
                    <>Thank you for casting your daily heart.</>
                  )}
                </p>
                <p className="mt-1 text-sm text-brown/65">
                  Your next heart will be ready soon.
                </p>

                {/* Countdown chip */}
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-brown/15 bg-white/80 px-4 py-2 shadow-soft backdrop-blur">
                  <Clock className="h-3.5 w-3.5 text-pink-dark" strokeWidth={2.4} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-brown/65">
                    Next heart in
                  </span>
                  <span className="font-display text-sm font-bold text-brown">
                    {nextVoteAt ? (
                      <CountdownTimer target={nextVoteAt} />
                    ) : (
                      "—"
                    )}
                  </span>
                </div>

                {/* Action */}
                <motion.button
                  type="button"
                  onClick={onClose}
                  whileTap={{ scale: 0.97 }}
                  className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brown px-5 py-3 text-sm font-semibold text-cream shadow-soft transition hover:bg-brown-400 hover:shadow-card"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
                  Back to Cats
                </motion.button>
              </div>

              <div className="h-2 sm:hidden" aria-hidden="true" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

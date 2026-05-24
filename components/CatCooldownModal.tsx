"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Heart,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CountdownTimer from "./CountdownTimer";
import CatDialogueBubble from "./CatDialogueBubble";
import { getCatDialogue } from "@/lib/catDialogues";
import type { AffectionLevel } from "@/lib/catAffection";
import { UNDO_WINDOW_MS } from "@/lib/voterStorage";
import type { Cat } from "@/lib/types";

type CatCooldownModalProps = {
  /** The hearted cat the user just tried to vote for again. */
  cat: Cat | null;
  /** Epoch ms — when this cat becomes voteable again. */
  nextAvailableAt: number | null;
  /** Epoch ms — when the user gave this cat its current heart. */
  heartedAt?: number | null;
  /** Affection level with this cat — tunes the dialogue tone. */
  affectionLevel?: AffectionLevel;
  /** Voter first name for dialogue interpolation. */
  voterFirstName?: string | null;
  onClose: () => void;
  /** Opens the storybook for the same cat. */
  onViewStory: (cat: Cat) => void;
  /**
   * Roll back the most recent vote for this cat. The button is only shown
   * when the vote was within the 15-minute undo window.
   */
  onUndo?: (cat: Cat) => void;
};

/**
 * Friendly per-cat cooldown popup. Shown when the user clicks the
 * "Hearted" button on a cat they've already given a heart to within the
 * 5-hour cooldown window. Reassures rather than blocks — celebrates the
 * support and shows when they can come back.
 */
export default function CatCooldownModal({
  cat,
  nextAvailableAt,
  heartedAt = null,
  affectionLevel = 0,
  voterFirstName,
  onClose,
  onViewStory,
  onUndo,
}: CatCooldownModalProps) {
  // Stable per (cat, voter, level) so the line doesn't change between
  // renders while the modal is open.
  const dialogue = useMemo(
    () =>
      cat
        ? getCatDialogue({
            cat,
            context: "cooldown",
            voterFirstName,
            affectionLevel,
          })
        : "",
    [cat, voterFirstName, affectionLevel],
  );

  // Live "now" for the undo countdown. Only ticks while the modal is open
  // and we actually have an undo window to count down.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!cat || !heartedAt || !onUndo) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [cat, heartedAt, onUndo]);

  const undoMsLeft =
    heartedAt && now !== null
      ? Math.max(0, heartedAt + UNDO_WINDOW_MS - now)
      : 0;
  const canUndo = !!onUndo && undoMsLeft > 0;
  const undoMin = Math.floor(undoMsLeft / 60000);
  const undoSec = Math.floor((undoMsLeft % 60000) / 1000);
  const undoLabel = `${undoMin}m ${String(undoSec).padStart(2, "0")}s left`;
  // Body scroll lock + Escape to close.
  useEffect(() => {
    if (!cat) return;
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
  }, [cat, onClose]);

  return (
    <AnimatePresence>
      {cat && (
        <motion.div
          key="cat-cooldown-root"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="cat-cooldown-title"
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

              {/* Soft paw watermark */}
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
                {/* Pulsing heart medallion */}
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
                  Cooldown · Already Hearted
                </p>

                <h2
                  id="cat-cooldown-title"
                  className="mt-3 font-display text-2xl font-bold leading-tight text-brown sm:text-[26px]"
                >
                  You already gave{" "}
                  <span className="text-pink-dark">{cat.name}</span> a heart 🐾
                </h2>

                <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-brown/75">
                  <span className="font-display font-bold text-pink-dark">
                    {cat.name}
                  </span>{" "}
                  is feeling loved! You can give another heart to this cat
                  after the cooldown ends.
                </p>

                {/* The cat speaks to the visitor */}
                {dialogue && (
                  <div className="mx-auto mt-4 inline-block">
                    <CatDialogueBubble text={dialogue} variant="compact" />
                  </div>
                )}

                {/* Countdown chip */}
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-brown/15 bg-white/80 px-4 py-2 shadow-soft backdrop-blur">
                  <Clock
                    className="h-3.5 w-3.5 text-pink-dark"
                    strokeWidth={2.4}
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-brown/65">
                    Next heart available in
                  </span>
                  <span className="font-display text-sm font-bold text-brown">
                    {nextAvailableAt ? (
                      <CountdownTimer target={nextAvailableAt} compact />
                    ) : (
                      "—"
                    )}
                  </span>
                </div>

                {/* Buttons — Back to Cats (primary) + View Story */}
                <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <motion.button
                    type="button"
                    onClick={onClose}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brown px-5 py-3 text-sm font-semibold text-cream shadow-soft transition hover:bg-brown-400 hover:shadow-card"
                  >
                    <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
                    Back to Cats
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => onViewStory(cat)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-brown/15 bg-white/80 px-5 py-3 text-sm font-semibold text-brown transition hover:border-brown/40 hover:bg-white active:scale-[0.98]"
                  >
                    <BookOpen className="h-4 w-4" strokeWidth={2.4} />
                    View Story
                  </button>
                </div>

                {/* Undo — only within 15min of the vote. Quiet visual: cream
                    surface, brown/55 text — discoverable but not destructive-
                    looking by default. Also revokes any reward earned from
                    this heart. */}
                <AnimatePresence>
                  {canUndo && cat && (
                    <motion.div
                      key="undo"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25 }}
                      className="mt-3"
                    >
                      <button
                        type="button"
                        onClick={() => onUndo?.(cat)}
                        className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-brown/12 bg-cream/70 px-5 py-2.5 text-[12.5px] font-semibold text-brown/70 transition hover:border-pink-dark/40 hover:bg-white hover:text-brown active:scale-[0.98]"
                      >
                        <RotateCcw
                          className="h-3.5 w-3.5 text-pink-dark/80 transition group-hover:text-pink-dark"
                          strokeWidth={2.4}
                        />
                        <span>Remove my heart</span>
                        <span
                          aria-hidden="true"
                          className="font-display text-[11px] text-brown/50 tabular-nums"
                        >
                          ({undoLabel})
                        </span>
                      </button>
                      <p className="mt-1.5 text-center text-[10.5px] text-brown/45">
                        Also revokes any reward earned from this heart.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="mt-3 text-center text-[11px] text-brown/45">
                  Other cats are still waiting for your heart 💖
                </p>
              </div>

              <div className="h-2 sm:hidden" aria-hidden="true" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

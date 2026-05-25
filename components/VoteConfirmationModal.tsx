"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { BookOpen, Check, Heart, Repeat, X } from "lucide-react";
import { useEffect } from "react";
import type { Cat } from "@/lib/types";
import { ordinal } from "@/lib/format";

type VoteConfirmationModalProps = {
  cat: Cat | null;
  onClose: () => void;
  onViewStory: (cat: Cat) => void;
  onConfirm: (cat: Cat) => void;
  onChangeCat: () => void;
};

/**
 * Vote confirmation popup triggered by "Give Heart" on a cat card.
 * - Mobile: bottom sheet (rounded top corners, slides up from the bottom).
 * - Desktop (sm+): centered modal, ~520px wide, image left + content right.
 *
 * Pure UI for now — no backend, no real vote submission.
 */
export default function VoteConfirmationModal({
  cat,
  onClose,
  onViewStory,
  onConfirm,
  onChangeCat,
}: VoteConfirmationModalProps) {
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
          key="vote-confirm-root"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="vote-confirm-title"
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

          {/* Sheet/Modal panel */}
          <motion.div
            // One animation for both layouts: slide up from below + fade.
            // Feels like a sheet on mobile and a gentle pop-up on desktop.
            initial={{ y: 80, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="
              relative z-10 w-full
              rounded-t-[28px]
              sm:max-w-[520px] sm:rounded-[28px]
            "
          >
            <div className="relative max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-t-[28px] bg-cream shadow-glass-inset scrollbar-none sm:rounded-[28px]">
              {/* Gradient accent edge */}
              <div className="h-1.5 w-full bg-gradient-to-r from-mint via-pink to-pink-dark" />

              {/* Mobile grab handle */}
              <div
                aria-hidden="true"
                className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-brown/15 sm:hidden"
              />

              {/* Close X */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-brown shadow-soft transition hover:bg-white"
              >
                <X className="h-4 w-4" strokeWidth={2.4} />
              </button>

              {/* Decorative floating hearts/paws — subtle, behind content */}
              <FloatingDecor />

              {/* Content area: stacked on mobile, side-by-side on sm+ */}
              <div className="relative grid gap-4 px-5 pb-5 pt-3 sm:grid-cols-[180px_1fr] sm:items-center sm:gap-5 sm:px-6 sm:pb-7 sm:pt-5">
                {/* Image */}
                <div className="relative mx-auto aspect-square w-32 overflow-hidden rounded-3xl bg-gradient-to-br from-mint-light via-cream to-pink-light shadow-card sm:mx-0 sm:aspect-[4/5] sm:w-full">
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 128px, 180px"
                    className="object-cover"
                  />
                  {/* Rank chip in corner of image — live leaderboard position */}
                  <span className="absolute left-2 top-2 inline-flex items-center justify-center rounded-full bg-brown/85 px-2 py-0.5 font-display text-[11px] font-semibold text-cream backdrop-blur">
                    {ordinal(cat.liveRank ?? cat.rank)}
                  </span>
                </div>

                {/* Text + actions */}
                <div className="flex flex-col gap-3 text-center sm:text-left">
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-pink/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-pink-dark">
                      <Heart className="h-3 w-3" fill="currentColor" strokeWidth={0} />
                      Daily Heart
                    </span>
                    <h2
                      id="vote-confirm-title"
                      className="mt-2 font-display text-2xl font-bold leading-tight text-brown sm:text-[26px]"
                    >
                      {cat.name}
                    </h2>
                    <p className="font-display text-sm italic text-pink-dark sm:text-base">
                      {cat.title}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-mint/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brown-400">
                      {cat.personality}
                    </span>
                  </div>

                  <p className="text-[15px] leading-relaxed text-brown/75">
                    Ready to give your daily heart to{" "}
                    <span className="font-semibold text-brown">{cat.name}</span>?
                  </p>

                  {/* Actions */}
                  <div className="mt-1 flex flex-col gap-2">
                    {/* Primary — Confirm Vote */}
                    <motion.button
                      type="button"
                      onClick={() => onConfirm(cat)}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brown px-5 py-3.5 text-sm font-semibold text-cream shadow-soft transition hover:bg-brown-400 hover:shadow-card"
                    >
                      <Check className="h-4 w-4" strokeWidth={2.6} />
                      Confirm Vote
                    </motion.button>

                    {/* Secondary row */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onViewStory(cat)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-brown/15 bg-white/80 px-3 py-2.5 text-xs font-semibold text-brown transition hover:border-brown/40 hover:bg-white active:scale-[0.98]"
                      >
                        <BookOpen className="h-3.5 w-3.5" strokeWidth={2.2} />
                        View Story
                      </button>
                      <button
                        type="button"
                        onClick={onChangeCat}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-brown/15 bg-white/80 px-3 py-2.5 text-xs font-semibold text-brown transition hover:border-brown/40 hover:bg-white active:scale-[0.98]"
                      >
                        <Repeat className="h-3.5 w-3.5" strokeWidth={2.2} />
                        Change Cat
                      </button>
                    </div>
                  </div>

                  <p className="mt-1 text-center text-[11px] text-brown/45 sm:text-left">
                    One vote per guest, per day. Choose with your heart.
                  </p>
                </div>
              </div>

              {/* Safe-area spacer for iOS gesture bar on mobile sheet */}
              <div className="h-2 sm:hidden" aria-hidden="true" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ----------- Decorative floaters inside the popup -----------

const DECOR = [
  { type: "heart" as const, top: "8%", left: "6%", size: 18, delay: 0, color: "text-pink/40" },
  { type: "paw" as const, top: "6%", left: "82%", size: 24, delay: 0.4, color: "text-mint-dark/35" },
  { type: "heart" as const, top: "78%", left: "4%", size: 14, delay: 0.9, color: "text-pink-dark/30" },
  { type: "paw" as const, top: "72%", left: "88%", size: 20, delay: 0.6, color: "text-pink/30" },
];

function FloatingDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {DECOR.map((d, i) => (
        <motion.div
          key={i}
          className={`absolute ${d.color}`}
          style={{ top: d.top, left: d.left, width: d.size, height: d.size }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: [0, -10, 0] }}
          transition={{
            opacity: { duration: 0.6, delay: d.delay },
            y: {
              duration: 4 + i * 0.5,
              delay: d.delay,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
        >
          {d.type === "heart" ? (
            <svg viewBox="0 0 24 24" className="h-full w-full">
              <path
                fill="currentColor"
                d="M12 21s-7.5-4.6-9.5-9.4C1 7.7 3.6 4 7.2 4c2 0 3.7 1 4.8 2.6C13.1 5 14.8 4 16.8 4 20.4 4 23 7.7 21.5 11.6 19.5 16.4 12 21 12 21z"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 64 64" className="h-full w-full">
              <g fill="currentColor">
                <ellipse cx="32" cy="42" rx="14" ry="11" />
                <ellipse cx="14" cy="26" rx="6" ry="8" />
                <ellipse cx="50" cy="26" rx="6" ry="8" />
                <ellipse cx="22" cy="12" rx="5" ry="7" />
                <ellipse cx="42" cy="12" rx="5" ry="7" />
              </g>
            </svg>
          )}
        </motion.div>
      ))}
    </div>
  );
}

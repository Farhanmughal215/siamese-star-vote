"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Compass, Heart, Sparkles, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import type { Cat } from "@/lib/types";
import { getCatDialogue } from "@/lib/catDialogues";
import type { AffectionLevel } from "@/lib/catAffection";
import CatDialogueBubble from "./CatDialogueBubble";

type SuccessModalProps = {
  cat: Cat | null;
  /** Affection level the cat has REACHED with this heart (post-vote). */
  affectionLevel?: AffectionLevel;
  /** Voter first name for dialogue interpolation. */
  voterFirstName?: string | null;
  onClose: () => void;
  onSpinFortune: (cat: Cat) => void;
  onContinue: () => void;
};

// Pre-computed particle config — fixed so each open looks choreographed.
type Particle = {
  type: "heart" | "paw" | "sparkle";
  angle: number;   // radians
  distance: number; // px
  size: number;
  delay: number;
  color: string;
};

function buildParticles(): Particle[] {
  const items: Particle[] = [];
  const palette = ["text-pink-dark", "text-pink", "text-mint-dark", "text-brown-300"];
  const types: Particle["type"][] = ["heart", "paw", "sparkle"];
  const count = 18;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 2 ? 0.1 : -0.1);
    const distance = 110 + (i % 4) * 18;
    items.push({
      type: types[i % types.length],
      angle,
      distance,
      size: 12 + (i % 3) * 4,
      delay: (i % 6) * 0.05,
      color: palette[i % palette.length],
    });
  }
  return items;
}

const PARTICLES = buildParticles();

export default function SuccessModal({
  cat,
  affectionLevel = 0,
  voterFirstName,
  onClose,
  onSpinFortune,
  onContinue,
}: SuccessModalProps) {
  // Pick once per cat+voter so the line is stable for the duration of the
  // modal (re-renders for unrelated state shouldn't shuffle the dialogue).
  const dialogue = useMemo(
    () =>
      cat
        ? getCatDialogue({
            cat,
            context: "afterHeart",
            voterFirstName,
            affectionLevel,
          })
        : "",
    [cat, voterFirstName, affectionLevel],
  );
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

  // Re-shuffle particle delays on each open for a freshly-choreographed feel.
  const particles = useMemo(() => PARTICLES, []);

  return (
    <AnimatePresence>
      {cat && (
        <motion.div
          key="success-root"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="success-title"
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
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative z-10 w-full rounded-t-[28px] sm:max-w-[480px] sm:rounded-[28px]"
          >
            <div className="relative max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-t-[28px] bg-cream shadow-glass-inset scrollbar-none sm:rounded-[28px]">
              {/* Pink/mint accent stripe */}
              <div className="h-1.5 w-full bg-gradient-to-r from-mint via-pink to-pink-dark" />

              {/* Mobile grab handle */}
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

              {/* Celebration stage — avatar at center with bursting particles */}
              <div className="relative flex flex-col items-center px-5 pb-5 pt-8 text-center sm:px-7 sm:pt-10">
                <div className="relative h-44 w-44 sm:h-48 sm:w-48">
                  {/* Soft glow halo behind the avatar */}
                  <motion.div
                    aria-hidden="true"
                    className="absolute inset-0 -m-8 rounded-full bg-gradient-to-br from-pink-light/70 via-cream to-mint-light/70 blur-xl"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                  />

                  {/* Bursting particles */}
                  <div className="absolute inset-0">
                    {particles.map((p, i) => {
                      const dx = Math.cos(p.angle) * p.distance;
                      const dy = Math.sin(p.angle) * p.distance;
                      return (
                        <motion.span
                          key={i}
                          className={`absolute left-1/2 top-1/2 ${p.color}`}
                          style={{ width: p.size, height: p.size, marginLeft: -p.size / 2, marginTop: -p.size / 2 }}
                          initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
                          animate={{
                            x: dx,
                            y: dy,
                            scale: [0, 1.2, 1, 0.9],
                            opacity: [0, 1, 1, 0],
                            rotate: i % 2 === 0 ? 35 : -35,
                          }}
                          transition={{
                            duration: 1.6,
                            delay: 0.15 + p.delay,
                            ease: [0.18, 0.7, 0.3, 1],
                          }}
                        >
                          <ParticleGlyph type={p.type} />
                        </motion.span>
                      );
                    })}
                  </div>

                  {/* Avatar */}
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                    className="relative h-full w-full overflow-hidden rounded-full border-4 border-cream bg-gradient-to-br from-mint-light via-cream to-pink-light shadow-card"
                  >
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      fill
                      sizes="192px"
                      className="object-cover"
                      priority
                    />
                  </motion.div>

                  {/* Heart badge below avatar */}
                  <motion.div
                    aria-hidden="true"
                    initial={{ y: 10, scale: 0, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    transition={{ type: "spring", delay: 0.4, stiffness: 260, damping: 16 }}
                    className="absolute -bottom-2 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-pink to-pink-dark shadow-card"
                  >
                    <Heart className="h-6 w-6 text-cream" fill="currentColor" strokeWidth={0} />
                  </motion.div>
                </div>

                {/* Title + copy */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.5 }}
                  className="mt-8"
                >
                  <p className="inline-flex items-center gap-1 rounded-full bg-pink/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-pink-dark">
                    <Heart className="h-3 w-3" fill="currentColor" strokeWidth={0} />
                    Vote Confirmed
                  </p>
                  <h2
                    id="success-title"
                    className="mt-3 font-display text-3xl font-bold leading-tight text-brown sm:text-[32px]"
                  >
                    {cat.name} feels loved today!
                  </h2>
                  <p className="mx-auto mt-3 max-w-xs text-[14px] leading-relaxed text-brown/75 sm:max-w-sm sm:text-[15px]">
                    Thank you for supporting rescued cats at Siamese Cat Café.
                  </p>

                  {/* The cat speaks — personalised to the visitor + bond */}
                  {dialogue && (
                    <div className="mx-auto mt-4 max-w-xs sm:max-w-sm">
                      <CatDialogueBubble text={dialogue} />
                    </div>
                  )}
                </motion.div>

                {/* CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="mt-6 flex w-full flex-col gap-2"
                >
                  <motion.button
                    type="button"
                    onClick={() => onSpinFortune(cat)}
                    whileTap={{ scale: 0.97 }}
                    className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-brown px-5 py-3.5 text-sm font-semibold text-cream shadow-soft transition hover:bg-brown-400 hover:shadow-card"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />
                    <Sparkles className="h-4 w-4 text-pink-light" strokeWidth={2.4} />
                    <span className="relative">Spin Paw Fortune</span>
                  </motion.button>
                  <button
                    type="button"
                    onClick={onContinue}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-brown/15 bg-white/75 px-5 py-3 text-sm font-semibold text-brown transition hover:border-brown/40 hover:bg-white active:scale-[0.98]"
                  >
                    <Compass className="h-4 w-4" strokeWidth={2.2} />
                    Continue Exploring
                  </button>
                </motion.div>
              </div>

              {/* iOS safe area spacer */}
              <div className="h-2 sm:hidden" aria-hidden="true" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ParticleGlyph({ type }: { type: "heart" | "paw" | "sparkle" }) {
  if (type === "heart") {
    return (
      <svg viewBox="0 0 24 24" className="h-full w-full">
        <path
          fill="currentColor"
          d="M12 21s-7.5-4.6-9.5-9.4C1 7.7 3.6 4 7.2 4c2 0 3.7 1 4.8 2.6C13.1 5 14.8 4 16.8 4 20.4 4 23 7.7 21.5 11.6 19.5 16.4 12 21 12 21z"
        />
      </svg>
    );
  }
  if (type === "paw") {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <g fill="currentColor">
          <ellipse cx="32" cy="42" rx="14" ry="11" />
          <ellipse cx="14" cy="26" rx="6" ry="8" />
          <ellipse cx="50" cy="26" rx="6" ry="8" />
          <ellipse cx="22" cy="12" rx="5" ry="7" />
          <ellipse cx="42" cy="12" rx="5" ry="7" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full">
      <path
        fill="currentColor"
        d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"
      />
    </svg>
  );
}

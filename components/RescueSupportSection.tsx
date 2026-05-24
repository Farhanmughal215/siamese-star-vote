"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart, PawPrint, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type RescueSupportSectionProps = {
  /** Baseline mock count of hearts already shared (frontend mock for now). */
  baseCount?: number;
  /**
   * Increments whenever the user casts a vote. The section watches this
   * value and triggers a brief glow + +1 bump + floating heart burst.
   */
  pulseKey?: number;
};

// ---------- Count-up hook ----------

function useCountUp(target: number, duration = 1800) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Ease-out cubic for a satisfying landing.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

// Pre-computed offsets so each burst feels choreographed, not random.
const BURST_OFFSETS = [-44, -22, 0, 22, 44, -10, 14];

/**
 * Emotional "Support Rescue Cats" section. Mock-counts a baseline of hearts
 * shared and bumps +1 with a brief celebration whenever pulseKey changes.
 */
export default function RescueSupportSection({
  baseCount = 18420,
  pulseKey = 0,
}: RescueSupportSectionProps) {
  const reduced = useReducedMotion();

  // Local bonus we add on top of the baseline so the live total can climb
  // by +1 each time the user votes within the session.
  const [bonus, setBonus] = useState(0);
  const [burstKey, setBurstKey] = useState(0);
  const [glow, setGlow] = useState(false);

  // React to vote pulses from the parent.
  useEffect(() => {
    if (pulseKey <= 0) return;
    setBonus((b) => b + 1);
    setBurstKey((k) => k + 1);
    setGlow(true);
    const t = window.setTimeout(() => setGlow(false), 2200);
    return () => window.clearTimeout(t);
  }, [pulseKey]);

  const totalTarget = baseCount + bonus;
  const animated = useCountUp(totalTarget);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="relative mx-auto mt-10 max-w-7xl px-4 pb-2 sm:px-6"
      aria-label="Support rescue cats"
    >
      <div
        className={`relative overflow-hidden rounded-[28px] border border-brown/10 px-5 py-8 shadow-card transition-shadow duration-700 sm:px-10 sm:py-10 ${
          glow ? "shadow-glow" : ""
        }`}
        style={{
          background:
            "linear-gradient(135deg, #fdf5ec 0%, #fef9f1 45%, #fff 100%)",
        }}
      >
        {/* Soft brand wash overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-mint-light/35 via-transparent to-pink-light/35"
        />

        {/* Big background paw watermark */}
        <svg
          aria-hidden="true"
          viewBox="0 0 64 64"
          className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 text-pink/10 sm:h-60 sm:w-60"
        >
          <g fill="currentColor">
            <ellipse cx="32" cy="42" rx="14" ry="11" />
            <ellipse cx="14" cy="26" rx="6" ry="8" />
            <ellipse cx="50" cy="26" rx="6" ry="8" />
            <ellipse cx="22" cy="12" rx="5" ry="7" />
            <ellipse cx="42" cy="12" rx="5" ry="7" />
          </g>
        </svg>

        {/* Pulse glow ring on vote */}
        <AnimatePresence>
          {glow && (
            <motion.div
              key={burstKey}
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.7, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 rounded-[28px]"
              style={{
                boxShadow: "inset 0 0 80px 10px rgba(231,158,174,0.45)",
              }}
            />
          )}
        </AnimatePresence>

        <div className="relative flex flex-col items-center text-center">
          {/* Pulsing heart icon */}
          <motion.div
            className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink to-pink-dark shadow-card sm:h-20 sm:w-20"
            animate={reduced ? { scale: 1 } : { scale: [1, 1.06, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Heart
              className="h-8 w-8 text-cream sm:h-10 sm:w-10"
              fill="currentColor"
              strokeWidth={0}
            />
            <span className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-mint shadow-soft">
              <PawPrint className="h-4 w-4 text-brown" strokeWidth={2.4} />
            </span>

            {/* Heart burst on vote — emanates from this icon */}
            <AnimatePresence>
              {burstKey > 0 && (
                <motion.div
                  key={burstKey}
                  className="pointer-events-none absolute inset-0"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {BURST_OFFSETS.map((dx, i) => (
                    <motion.span
                      key={i}
                      className="absolute left-1/2 top-1/2 text-pink-dark drop-shadow-[0_4px_10px_rgba(231,158,174,0.5)]"
                      initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                      animate={{
                        x: dx,
                        y: -70 - i * 4,
                        opacity: [0, 1, 1, 0],
                        scale: [0.5, 1.2, 1, 0.9],
                        rotate: dx > 0 ? 16 : -16,
                      }}
                      transition={{
                        duration: 1.4,
                        delay: i * 0.04,
                        ease: "easeOut",
                      }}
                    >
                      <Heart
                        className="h-4 w-4"
                        fill="currentColor"
                        strokeWidth={0}
                      />
                    </motion.span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Counter line */}
          <p className="inline-flex items-center gap-1.5 rounded-full bg-pink/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-pink-dark">
            <Sparkles className="h-3 w-3" strokeWidth={2.6} />
            Hearts Shared This Season
          </p>

          <h2 className="mt-3 flex items-center justify-center gap-2 font-display text-3xl font-bold leading-none text-brown sm:text-[40px]">
            <span aria-hidden="true">🐾</span>
            <motion.span
              key={animated}
              initial={{ scale: 1 }}
              animate={burstKey > 0 ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="tabular-nums"
            >
              {animated.toLocaleString()}
            </motion.span>
            <span className="font-display text-base font-bold text-brown/70 sm:text-lg">
              Hearts
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-brown/70 sm:text-[15px]">
            Every heart helps our rescued cats feel loved.
            <br className="hidden sm:block" />{" "}
            Thank you for supporting Siamese Cat Café rescue cats.
          </p>

          {/* Elegant progress visual — purely decorative, not corporate */}
          <div className="mt-5 w-full max-w-md">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-brown/55">
              <span>Season Goal · 25,000</span>
              <span className="text-pink-dark">
                {Math.min(100, Math.round((totalTarget / 25000) * 100))}%
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-brown/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, (totalTarget / 25000) * 100)}%`,
                }}
                transition={{ duration: 1.6, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-mint via-pink to-pink-dark"
              />
            </div>
          </div>

          {/* Small footer paws */}
          <div
            aria-hidden="true"
            className="mt-5 flex items-center gap-2 text-brown/40"
          >
            <PawPrint className="h-3 w-3" strokeWidth={2.4} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
              Siamese Cat Café · Rescue
            </span>
            <PawPrint className="h-3 w-3" strokeWidth={2.4} />
          </div>
        </div>
      </div>
    </motion.section>
  );
}

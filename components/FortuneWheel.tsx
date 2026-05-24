"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { WHEEL_COLORS, WHEEL_SECTIONS } from "@/data/rewards";
import type { Cat, WheelOutcome, WheelSection } from "@/lib/types";

// ---------- Geometry ----------

const SIZE = 360;
const CENTER = SIZE / 2;
const RADIUS = 170;

/** Convert a degree angle measured clockwise from the top to SVG coords. */
function polar(angleDegFromTop: number, radius: number) {
  const rad = ((angleDegFromTop - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

function sectionPath(startDeg: number, endDeg: number) {
  const start = polar(startDeg, RADIUS);
  const end = polar(endDeg, RADIUS);
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y} Z`;
}

// ---------- Component ----------

type FortuneWheelProps = {
  cat: Cat | null;
  outcome: WheelOutcome | null;
  /**
   * Sections drawn on the wheel face. Defaults to the static fallback so
   * the wheel still renders if the live config hasn't loaded yet.
   */
  sections?: WheelSection[];
  onComplete: () => void;
  onClose: () => void;
};

export default function FortuneWheel({
  cat,
  outcome,
  sections = WHEEL_SECTIONS,
  onComplete,
  onClose,
}: FortuneWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [target, setTarget] = useState(0);

  const sectionCount = sections.length;
  const sectionDeg = sectionCount > 0 ? 360 / sectionCount : 360;

  // When a new outcome is supplied, compute the final rotation and kick off
  // the spin after a brief entrance pause.
  useEffect(() => {
    if (!outcome || !cat) {
      setSpinning(false);
      setTarget(0);
      return;
    }
    setSpinning(false);
    const idx = Math.max(
      0,
      sections.findIndex((s) => s.id === outcome.section.id),
    );
    const jitter = (Math.random() - 0.5) * (sectionDeg * 0.6); // stay inside the section
    // 4 full spins + the angle needed to bring section idx under the top pointer.
    const finalAngle = 4 * 360 - (sectionDeg / 2 + idx * sectionDeg) + jitter;
    setTarget(finalAngle);

    const t = window.setTimeout(() => setSpinning(true), 650);
    return () => window.clearTimeout(t);
  }, [outcome, cat, sections, sectionDeg]);

  // Scroll lock + Escape (Escape disabled mid-spin to avoid breaking the flow).
  useEffect(() => {
    if (!cat) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !spinning) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [cat, onClose, spinning]);

  // After the wheel finishes spinning, hold for a beat so the result lands.
  const handleAnimationComplete = () => {
    if (!spinning) return;
    window.setTimeout(onComplete, 850);
  };

  return (
    <AnimatePresence>
      {cat && outcome && (
        <motion.div
          key="wheel-root"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-modal="true"
          role="dialog"
          aria-label="Paw Fortune Wheel"
        >
          <motion.div
            className="absolute inset-0 bg-brown/55 backdrop-blur-md"
            onClick={spinning ? undefined : onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true"
          />

          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            className="relative z-10 w-full rounded-t-[28px] sm:max-w-[520px] sm:rounded-[28px]"
          >
            <div className="relative max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-t-[28px] bg-cream shadow-glass-inset scrollbar-none sm:rounded-[28px]">
              <div className="h-1.5 w-full bg-gradient-to-r from-mint via-pink to-pink-dark" />
              <div
                aria-hidden="true"
                className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-brown/15 sm:hidden"
              />

              {!spinning && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-brown shadow-soft transition hover:bg-white"
                >
                  <X className="h-4 w-4" strokeWidth={2.4} />
                </button>
              )}

              <div className="px-5 pb-6 pt-3 sm:px-7 sm:pb-8 sm:pt-5">
                {/* Heading */}
                <div className="text-center">
                  <p className="inline-flex items-center gap-1 rounded-full bg-pink/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-pink-dark">
                    Paw Fortune
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold leading-tight text-brown sm:text-[28px]">
                    {spinning ? "Spinning..." : "A little gift from the cats"}
                  </h2>
                  <p className="mt-1 text-xs text-brown/65">
                    Voted for{" "}
                    <span className="font-semibold text-brown">{cat.name}</span>
                  </p>
                </div>

                {/* Wheel container */}
                <div className="relative mx-auto mt-5 aspect-square w-full max-w-[340px] sm:max-w-[380px]">
                  {/* Pointer (paw + triangle), static at top */}
                  <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1">
                    <svg width="40" height="50" viewBox="0 0 40 50" aria-hidden="true">
                      <ellipse cx="20" cy="44" rx="9" ry="2.5" fill="#5a3114" opacity="0.2" />
                      <path d="M 5 8 L 35 8 L 20 40 Z" fill="#5a3114" />
                      <circle cx="20" cy="9" r="7" fill="#e79eae" />
                      <circle cx="20" cy="9" r="3" fill="#fdf5ec" />
                    </svg>
                  </div>

                  {/* Rotating wheel */}
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: spinning ? target : 0 }}
                    transition={
                      spinning
                        ? { duration: 4.5, ease: [0.12, 0.72, 0.26, 1] }
                        : { duration: 0 }
                    }
                    onAnimationComplete={handleAnimationComplete}
                    style={{ transformOrigin: "50% 50%" }}
                    className="h-full w-full"
                  >
                    <svg
                      viewBox={`0 0 ${SIZE} ${SIZE}`}
                      className="h-full w-full drop-shadow-[0_12px_40px_rgba(90,49,20,0.22)]"
                    >
                      {/* Outer dark ring */}
                      <circle cx={CENTER} cy={CENTER} r={RADIUS + 5} fill="#5a3114" />

                      {/* Sections */}
                      {sections.map((sec, i) => {
                        const start = i * sectionDeg;
                        const end = start + sectionDeg;
                        const mid = start + sectionDeg / 2;
                        return (
                          <g key={sec.id}>
                            <path
                              d={sectionPath(start, end)}
                              fill={WHEEL_COLORS[i % WHEEL_COLORS.length]}
                              stroke="#5a3114"
                              strokeOpacity="0.14"
                              strokeWidth="1"
                            />

                            {/* Label group, pre-rotated so it ends up upright at top */}
                            <g transform={`rotate(${mid} ${CENTER} ${CENTER})`}>
                              <text
                                x={CENTER}
                                y={62}
                                textAnchor="middle"
                                style={{ fontSize: "22px" }}
                              >
                                {sec.emoji}
                              </text>
                              <text
                                x={CENTER}
                                y={82}
                                textAnchor="middle"
                                fill="#5a3114"
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  letterSpacing: "0.02em",
                                }}
                              >
                                {sec.wheelLabel}
                              </text>
                            </g>
                          </g>
                        );
                      })}

                      {/* Section dividers */}
                      {Array.from({ length: sectionCount }).map((_, i) => {
                        const p = polar(i * sectionDeg, RADIUS);
                        return (
                          <line
                            key={i}
                            x1={CENTER}
                            y1={CENTER}
                            x2={p.x}
                            y2={p.y}
                            stroke="#5a3114"
                            strokeOpacity="0.2"
                            strokeWidth="1.4"
                          />
                        );
                      })}

                      {/* Center hub */}
                      <circle cx={CENTER} cy={CENTER} r="38" fill="#5a3114" />
                      <circle cx={CENTER} cy={CENTER} r="32" fill="#fdf5ec" />
                      <circle
                        cx={CENTER}
                        cy={CENTER}
                        r="32"
                        fill="none"
                        stroke="#5a3114"
                        strokeOpacity="0.18"
                        strokeWidth="2"
                      />
                      {/* Paw glyph at center */}
                      <g transform={`translate(${CENTER - 16} ${CENTER - 18})`}>
                        <ellipse cx="16" cy="24" rx="9" ry="7" fill="#5a3114" />
                        <ellipse cx="5" cy="15" rx="3.5" ry="5" fill="#5a3114" />
                        <ellipse cx="27" cy="15" rx="3.5" ry="5" fill="#5a3114" />
                        <ellipse cx="10" cy="6" rx="3" ry="4" fill="#5a3114" />
                        <ellipse cx="22" cy="6" rx="3" ry="4" fill="#5a3114" />
                      </g>
                    </svg>
                  </motion.div>

                  {/* Pulsing glow while spinning */}
                  {spinning && (
                    <motion.div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-2 rounded-full"
                      animate={{ opacity: [0.35, 0.7, 0.35] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                      style={{ boxShadow: "0 0 60px 4px rgba(231,158,174,0.4) inset" }}
                    />
                  )}
                </div>

                <p className="mt-4 text-center text-xs italic text-brown/55">
                  {spinning
                    ? "The cats are choosing for you..."
                    : "Get ready — the wheel is about to spin."}
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

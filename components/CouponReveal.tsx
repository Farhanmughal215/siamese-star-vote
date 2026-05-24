"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import CouponCard from "./CouponCard";
import type { Cat, Coupon } from "@/lib/types";

type CouponRevealProps = {
  coupon: Coupon;
  cat: Cat;
  /** Fires when the reveal sequence finishes (immediate for reduced motion). */
  onRevealComplete?: () => void;
  className?: string;
};

type Phase = "sealed" | "shaking" | "opening" | "revealed";

// Sequence timing — tuned so the reveal feels intentional, not slow.
const T_SHAKE_START = 380;
const T_OPEN_START = 1500;
const T_REVEAL = 2750;
const COUPON_EMERGE_DELAY_S = 0.25;
const COUPON_EMERGE_DURATION_S = 0.9;

// Envelope geometry (px). The coupon is sandwiched between the back and front
// panels so it can genuinely RISE UP THROUGH the envelope mouth.
const ENV_WIDTH = 300;
const ENV_HEIGHT = 196;
const FRONT_TOP_PCT = 22;   // y% where the front panel's V edges sit
const V_APEX_PCT = 44;      // y% of the V apex (envelope mouth)
const RESERVED_HEIGHT = 460;

/**
 * Animated envelope reveal.
 *
 *  Layer stack (back to front):
 *   z-0   : soft glow halo
 *   z-10  : envelope back panel
 *   z-20  : the coupon itself (always mounted, transforms from "inside" to natural)
 *   z-30  : envelope front (V-cut) + flap + paw seal
 *   z-40  : sparkle burst (over the mouth, during opening)
 *
 * Because the coupon sits between the back and front panels, when it scales
 * up and rises (y: 200 → 0), the front panel hides its lower half until it
 * has fully cleared the envelope mouth — selling the "emerging from inside"
 * effect.
 *
 * Respects reduced motion — shows the coupon immediately, no envelope.
 */
export default function CouponReveal({
  coupon,
  cat,
  onRevealComplete,
  className = "",
}: CouponRevealProps) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduced ? "revealed" : "sealed");

  useEffect(() => {
    if (reduced) {
      onRevealComplete?.();
      return;
    }
    const t1 = window.setTimeout(() => setPhase("shaking"), T_SHAKE_START);
    const t2 = window.setTimeout(() => setPhase("opening"), T_OPEN_START);
    const t3 = window.setTimeout(() => {
      setPhase("revealed");
      onRevealComplete?.();
    }, T_REVEAL);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [reduced, onRevealComplete]);

  const showEnvelope = phase !== "revealed";
  const flapOpen = phase === "opening" || phase === "revealed";
  const couponEmerging = phase === "opening" || phase === "revealed";
  const isShaking = phase === "shaking";

  // Shake applied identically to back + front so they stay aligned.
  const shakeAnim = isShaking
    ? { x: [0, -3, 3, -2, 2, 0], rotate: [0, -1, 1, -0.6, 0.6, 0] }
    : { x: 0, rotate: 0 };
  const shakeTransition = isShaking
    ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" as const }
    : { duration: 0.3 };

  return (
    <motion.div
      className={`relative ${className}`}
      // Reserve enough space for the envelope-below-coupon stack. After reveal,
      // collapse smoothly to the coupon's natural height.
      animate={{ minHeight: phase === "revealed" ? 0 : RESERVED_HEIGHT }}
      transition={{
        duration: 0.45,
        delay: phase === "revealed" ? 0.15 : 0,
        ease: "easeInOut",
      }}
    >
      {/* ----- Glow halo (z-0) ----- */}
      <AnimatePresence>
        {showEnvelope && (
          <motion.div
            key="halo"
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: -40,
              width: ENV_WIDTH + 180,
              height: ENV_HEIGHT + 180,
              background:
                "radial-gradient(closest-side, rgba(231,158,174,0.6), rgba(187,221,211,0.32) 50%, transparent 75%)",
              filter: "blur(22px)",
              zIndex: 0,
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={
              isShaking || phase === "opening"
                ? {
                    opacity: [0.45, 0.78, 0.55, 0.8, 0.5],
                    scale: [0.95, 1.05, 1, 1.07, 0.98],
                  }
                : { opacity: 0.45, scale: 1 }
            }
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.55 } }}
            transition={
              isShaking || phase === "opening"
                ? { duration: 1.7, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.4 }
            }
          />
        )}
      </AnimatePresence>

      {/* ----- Envelope back panel (z-10) ----- */}
      <AnimatePresence>
        {showEnvelope && (
          <motion.div
            key="env-back"
            className="pointer-events-none absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: 0,
              width: ENV_WIDTH,
              height: ENV_HEIGHT,
              zIndex: 10,
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0, ...shakeAnim }}
            exit={{
              opacity: 0,
              y: 24,
              transition: { duration: 0.55, delay: 0.2 },
            }}
            transition={
              isShaking
                ? shakeTransition
                : { type: "spring", stiffness: 240, damping: 22 }
            }
          >
            <EnvelopeBack />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----- Coupon (z-20) — sandwiched between back + front ----- */}
      <motion.div
        className="relative"
        style={{ zIndex: 20, transformOrigin: "center center" }}
        initial={reduced ? false : { y: 200, scale: 0.6, opacity: 0 }}
        animate={
          couponEmerging
            ? { y: 0, scale: 1, opacity: 1 }
            : { y: 200, scale: 0.6, opacity: 1 }
        }
        transition={{
          duration: COUPON_EMERGE_DURATION_S,
          delay: phase === "opening" ? COUPON_EMERGE_DELAY_S : 0,
          ease: [0.22, 0.78, 0.36, 1],
        }}
      >
        <CouponCard coupon={coupon} cat={cat} />
      </motion.div>

      {/* ----- Envelope front panel + flap + seal (z-30) ----- */}
      <AnimatePresence>
        {showEnvelope && (
          <motion.div
            key="env-front"
            className="pointer-events-none absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: 0,
              width: ENV_WIDTH,
              height: ENV_HEIGHT,
              zIndex: 30,
              perspective: 1000,
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0, ...shakeAnim }}
            exit={{
              opacity: 0,
              y: 24,
              transition: { duration: 0.55, delay: 0.2 },
            }}
            transition={
              isShaking
                ? shakeTransition
                : { type: "spring", stiffness: 240, damping: 22 }
            }
          >
            <EnvelopeFront flapOpen={flapOpen} sealPhase={phase} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----- Sparkle burst (z-40) — at the envelope mouth ----- */}
      <AnimatePresence>
        {phase === "opening" && (
          <motion.div
            key="sparkles"
            className="pointer-events-none absolute left-1/2 -translate-x-1/2"
            style={{
              // Position at the envelope's V apex (mouth).
              bottom: ENV_HEIGHT * (1 - V_APEX_PCT / 100) - 4,
              width: 0,
              height: 0,
              zIndex: 40,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SparkleBurst />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============= Envelope back panel =============

function EnvelopeBack() {
  return (
    <div
      className="absolute inset-0 rounded-[14px]"
      style={{
        background:
          "linear-gradient(165deg, #f9e0e8 0%, #f5c8d5 50%, #efb0c2 100%)",
        boxShadow:
          "0 22px 40px -16px rgba(180,80,110,0.5), 0 0 0 1px rgba(120,40,60,0.18) inset, inset 0 1px 0 rgba(255,255,255,0.6)",
        border: "1px solid rgba(120,40,60,0.22)",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-[14px] opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.4) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}

// ============= Envelope front (V-cut) + flap + seal =============

function EnvelopeFront({
  flapOpen,
  sealPhase,
}: {
  flapOpen: boolean;
  sealPhase: Phase;
}) {
  // Polygons share the V geometry so the flap's bottom edge exactly meets
  // the front panel's V cut.
  const FRONT_CLIP = `polygon(0 ${FRONT_TOP_PCT}%, 50% ${V_APEX_PCT}%, 100% ${FRONT_TOP_PCT}%, 100% 100%, 0 100%)`;
  const FLAP_CLIP = `polygon(0 0, 100% 0, 100% ${FRONT_TOP_PCT}%, 50% ${V_APEX_PCT}%, 0 ${FRONT_TOP_PCT}%)`;

  return (
    <div className="absolute inset-0">
      {/* Front panel — V-cut at top */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(170deg, #f6cfdc 0%, #efb6c8 55%, #e89fb5 100%)",
          clipPath: FRONT_CLIP,
          borderRadius: 14,
        }}
      />

      {/* V seam shadow — adds depth right under the V edge */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          clipPath: `polygon(0 ${FRONT_TOP_PCT}%, 50% ${V_APEX_PCT}%, 100% ${FRONT_TOP_PCT}%, 100% ${FRONT_TOP_PCT + 3}%, 50% ${V_APEX_PCT + 3}%, 0 ${FRONT_TOP_PCT + 3}%)`,
          background:
            "linear-gradient(180deg, rgba(120,40,60,0.3), transparent)",
        }}
      />

      {/* Front panel bottom highlight — gives the paper subtle sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.16) 60%, transparent 100%)",
          borderBottomLeftRadius: 14,
          borderBottomRightRadius: 14,
        }}
      />

      {/* "From the Café" tag — sits at the bottom of the front panel */}
      <div className="absolute bottom-3 left-1/2 z-[2] -translate-x-1/2">
        <span className="inline-flex items-center gap-1 rounded-full bg-cream/92 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-brown/75 shadow-soft backdrop-blur">
          From the Café
        </span>
      </div>

      {/* Envelope flap — rotates open from its top edge */}
      <motion.div
        className="absolute inset-0 origin-top"
        style={{ transformStyle: "preserve-3d", zIndex: 1 }}
        animate={flapOpen ? { rotateX: -168 } : { rotateX: 0 }}
        transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
      >
        {/* Outer flap face — slightly lighter than the front panel */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(168deg, #fbdbe4 0%, #f4bdce 55%, #e89fb5 100%)",
            clipPath: FLAP_CLIP,
            filter: "drop-shadow(0 3px 6px rgba(120,40,60,0.28))",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
          }}
        />
        {/* Inner flap face — visible after the flap folds back */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(348deg, #fdf5ec 0%, #f5e5d5 80%)",
            clipPath: FLAP_CLIP,
            transform: "rotateX(180deg)",
            backfaceVisibility: "hidden",
          }}
        />
      </motion.div>

      {/* Paw seal — sits on the V apex, pops off when the envelope opens */}
      <PawSeal phase={sealPhase} />
    </div>
  );
}

// ============= Paw seal =============

function PawSeal({ phase }: { phase: Phase }) {
  const sealAnim =
    phase === "shaking"
      ? {
          scale: [1, 1.1, 1],
          boxShadow: [
            "0 0 0 0 rgba(231,158,174,0.65), 0 6px 16px -4px rgba(120,40,60,0.45)",
            "0 0 0 14px rgba(231,158,174,0), 0 6px 16px -4px rgba(120,40,60,0.45)",
            "0 0 0 0 rgba(231,158,174,0.65), 0 6px 16px -4px rgba(120,40,60,0.45)",
          ],
        }
      : phase === "opening" || phase === "revealed"
        ? { y: -60, scale: 0.4, opacity: 0, rotate: 38 }
        : { scale: 1, opacity: 1 };

  const sealTransition =
    phase === "shaking"
      ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" as const }
      : phase === "opening" || phase === "revealed"
        ? { duration: 0.55, ease: "easeOut" as const }
        : { duration: 0.4 };

  return (
    <motion.div
      className="absolute"
      style={{
        left: "50%",
        top: `${V_APEX_PCT}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 3,
      }}
      animate={sealAnim}
      transition={sealTransition}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, #f4b9c8 0%, #e79eae 55%, #b85f73 100%)",
          boxShadow:
            "0 6px 16px -4px rgba(120,40,60,0.45), inset 0 1px 1px rgba(255,255,255,0.65), inset 0 -2px 3px rgba(120,40,60,0.3)",
        }}
      >
        <svg
          viewBox="0 0 64 64"
          className="h-6 w-6 text-cream"
          fill="currentColor"
          aria-hidden="true"
        >
          <ellipse cx="32" cy="42" rx="14" ry="11" />
          <ellipse cx="14" cy="26" rx="6" ry="8" />
          <ellipse cx="50" cy="26" rx="6" ry="8" />
          <ellipse cx="22" cy="12" rx="5" ry="7" />
          <ellipse cx="42" cy="12" rx="5" ry="7" />
        </svg>
      </div>
    </motion.div>
  );
}

// ============= Sparkle burst (at envelope mouth) =============

function SparkleBurst() {
  const sparkles = [
    { dx: -110, dy: -60,  delay: 0,    size: 14, color: "text-pink-dark" },
    { dx: 100,  dy: -66,  delay: 0.05, size: 16, color: "text-pink" },
    { dx: -140, dy: 0,    delay: 0.1,  size: 11, color: "text-mint-dark" },
    { dx: 130,  dy: -10,  delay: 0.08, size: 13, color: "text-pink-dark" },
    { dx: -50,  dy: -100, delay: 0.14, size: 10, color: "text-mint-dark" },
    { dx: 50,   dy: -106, delay: 0.18, size: 12, color: "text-pink" },
    { dx: 0,    dy: -120, delay: 0,    size: 15, color: "text-pink-dark" },
    { dx: -110, dy: -30,  delay: 0.22, size: 10, color: "text-pink" },
    { dx: 110,  dy: -36,  delay: 0.26, size: 11, color: "text-mint-dark" },
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ left: 0, top: 0 }}
    >
      {sparkles.map((s, i) => (
        <motion.span
          key={i}
          className={`absolute ${s.color}`}
          style={{
            width: s.size,
            height: s.size,
            left: -s.size / 2,
            top: -s.size / 2,
          }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
          animate={{
            x: s.dx,
            y: s.dy,
            scale: [0, 1.3, 1, 0.4],
            opacity: [0, 1, 0.9, 0],
            rotate: [0, 90, 180],
          }}
          transition={{
            duration: 1.05,
            delay: s.delay,
            ease: "easeOut",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-full w-full"
            fill="currentColor"
          >
            <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
          </svg>
        </motion.span>
      ))}
    </div>
  );
}

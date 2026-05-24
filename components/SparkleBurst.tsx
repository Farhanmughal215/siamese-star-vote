"use client";

import { motion } from "framer-motion";

type SparkleBurstProps = {
  /** Delay (s) before the burst begins — used to wait for FlyingHeart to land. */
  delay?: number;
};

type Particle = {
  type: "heart" | "sparkle";
  x: number;
  y: number;
  size: number;
  rot: number;
  color: string;
  delayBoost: number;
};

// Pre-computed offsets so the burst is choreographed, not random.
// Mix of pink hearts + mint-tinted sparkles for variety.
const PARTICLES: Particle[] = [
  { type: "heart",   x: 0,    y: -56, size: 16, rot: -8,  color: "text-pink-dark", delayBoost: 0.00 },
  { type: "sparkle", x: 42,   y: -38, size: 12, rot: 25,  color: "text-pink",      delayBoost: 0.05 },
  { type: "heart",   x: 56,   y: -4,  size: 14, rot: 20,  color: "text-pink-dark", delayBoost: 0.10 },
  { type: "sparkle", x: 44,   y: 34,  size: 10, rot: 50,  color: "text-mint-dark", delayBoost: 0.05 },
  { type: "heart",   x: 0,    y: 52,  size: 12, rot: 8,   color: "text-pink",      delayBoost: 0.10 },
  { type: "sparkle", x: -44,  y: 34,  size: 12, rot: -30, color: "text-pink-dark", delayBoost: 0.05 },
  { type: "heart",   x: -56,  y: -4,  size: 14, rot: -22, color: "text-pink-dark", delayBoost: 0.10 },
  { type: "sparkle", x: -42,  y: -38, size: 10, rot: 18,  color: "text-mint-dark", delayBoost: 0.05 },
  // Inner ring — smaller, faster fade
  { type: "sparkle", x: 22,   y: -16, size: 8,  rot: 12,  color: "text-pink",      delayBoost: 0.02 },
  { type: "sparkle", x: -22,  y: 18,  size: 8,  rot: -16, color: "text-pink",      delayBoost: 0.08 },
];

/**
 * Burst of small hearts + sparkles that emanate outward from the center
 * of the parent container. Render conditionally (e.g. when isAnimating
 * is true) — particles animate once on mount.
 */
export default function SparkleBurst({ delay = 0 }: SparkleBurstProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
    >
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute ${p.color} drop-shadow-[0_4px_10px_rgba(231,158,174,0.4)]`}
          style={{ width: p.size, height: p.size }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: [0, 1, 1, 0],
            scale: [0, 1.2, 1, 0.6],
            rotate: p.rot,
          }}
          transition={{
            duration: 0.7,
            delay: delay + p.delayBoost,
            ease: [0.22, 0.78, 0.36, 1],
          }}
        >
          {p.type === "heart" ? (
            <svg viewBox="0 0 24 24" className="h-full w-full" fill="currentColor">
              <path d="M12 21s-7.5-4.6-9.5-9.4C1 7.7 3.6 4 7.2 4c2 0 3.7 1 4.8 2.6C13.1 5 14.8 4 16.8 4 20.4 4 23 7.7 21.5 11.6 19.5 16.4 12 21 12 21z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-full w-full" fill="currentColor">
              <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
            </svg>
          )}
        </motion.span>
      ))}
    </div>
  );
}

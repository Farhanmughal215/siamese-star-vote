"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";
import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 640;
// On small phones we keep only a handful of particles — the rest of the
// brand wash + paw wallpaper carries the texture.
const MOBILE_PARTICLE_LIMIT = 5;

// ---------- Inline brand glyphs ----------

function Paw({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
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

function Heart({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 21s-7.5-4.6-9.5-9.4C1 7.7 3.6 4 7.2 4c2 0 3.7 1 4.8 2.6C13.1 5 14.8 4 16.8 4 20.4 4 23 7.7 21.5 11.6 19.5 16.4 12 21 12 21z"
      />
    </svg>
  );
}

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"
      />
    </svg>
  );
}

function Dot({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="6" fill="currentColor" />
    </svg>
  );
}

// ---------- Particle config ----------

type FloatItem = {
  type: "paw" | "heart" | "sparkle" | "dot";
  top: string;
  left: string;
  size: number;
  delay: number;
  duration: number;
  rotate: number;
  color: string;
  /** Scroll parallax factor — 0 = no parallax, 1 = matches scroll speed inverted. */
  parallax: number;
};

/**
 * Pre-computed positions so layout is deterministic on every render.
 * Tuned to feel "lived-in" rather than uniform — clusters where the eye
 * naturally rests, leaving the page edges quieter than the middle bands.
 */
const ITEMS: FloatItem[] = [
  { type: "paw", top: "5%", left: "5%", size: 30, delay: 0, duration: 11, rotate: -18, color: "text-pink/22", parallax: 0.18 },
  { type: "sparkle", top: "12%", left: "92%", size: 18, delay: 0.6, duration: 6, rotate: 0, color: "text-pink-dark/35", parallax: 0.26 },
  { type: "heart", top: "24%", left: "8%", size: 18, delay: 1, duration: 9, rotate: 12, color: "text-pink/30", parallax: 0.14 },
  { type: "paw", top: "38%", left: "94%", size: 26, delay: 1.6, duration: 11, rotate: 24, color: "text-mint-dark/30", parallax: 0.22 },
  { type: "sparkle", top: "52%", left: "3%", size: 14, delay: 2.2, duration: 5.5, rotate: 0, color: "text-pink/45", parallax: 0.16 },
  { type: "heart", top: "64%", left: "96%", size: 16, delay: 0.8, duration: 9, rotate: -8, color: "text-pink-dark/32", parallax: 0.22 },
  { type: "paw", top: "78%", left: "6%", size: 26, delay: 2.8, duration: 11, rotate: -14, color: "text-mint-dark/28", parallax: 0.28 },
  { type: "sparkle", top: "84%", left: "88%", size: 16, delay: 1.4, duration: 6, rotate: 0, color: "text-pink/42", parallax: 0.18 },
  { type: "heart", top: "92%", left: "22%", size: 14, delay: 2, duration: 9, rotate: 18, color: "text-pink/26", parallax: 0.14 },
];

// Brand-cream paw-texture wallpaper. Two very faint paws per 320×320 tile
// so the effect reads as warm café texture rather than wallpaper.
const PAW_PATTERN_URI = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'>
    <g fill='%235a3114' opacity='0.04'>
      <g transform='translate(60 80) rotate(-18) scale(0.5)'>
        <ellipse cx='32' cy='42' rx='14' ry='11'/>
        <ellipse cx='14' cy='26' rx='6' ry='8'/>
        <ellipse cx='50' cy='26' rx='6' ry='8'/>
        <ellipse cx='22' cy='12' rx='5' ry='7'/>
        <ellipse cx='42' cy='12' rx='5' ry='7'/>
      </g>
      <g transform='translate(220 210) rotate(22) scale(0.45)'>
        <ellipse cx='32' cy='42' rx='14' ry='11'/>
        <ellipse cx='14' cy='26' rx='6' ry='8'/>
        <ellipse cx='50' cy='26' rx='6' ry='8'/>
        <ellipse cx='22' cy='12' rx='5' ry='7'/>
        <ellipse cx='42' cy='12' rx='5' ry='7'/>
      </g>
    </g>
  </svg>`,
)}")`;

// ---------- Component ----------

/**
 * Global ambient layer. Three stacked sub-layers:
 *  1. Soft café-paw wallpaper (very low opacity, tiled, fixed)
 *  2. Brand radial wash on top of that
 *  3. ~14 drifting paws/hearts/sparkles with scroll parallax
 *
 * Render once near the top of the page. All layers are pointer-events-none
 * and fixed-positioned, so the rest of the UI behaves normally.
 *
 * Honors prefers-reduced-motion — disables continuous motion + parallax
 * but keeps the visual layer so the texture remains.
 */
export default function AmbientEffects() {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const [isMobile, setIsMobile] = useState(false);

  // Detect viewport size so we can trim particle count on small phones —
  // weaker GPUs notice the difference more than the eye does.
  useEffect(() => {
    const compute = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const visibleItems = isMobile ? ITEMS.slice(0, MOBILE_PARTICLE_LIMIT) : ITEMS;

  return (
    <>
      {/* 1. Tiled paw wallpaper */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-20"
        style={{
          backgroundImage: PAW_PATTERN_URI,
          backgroundRepeat: "repeat",
          backgroundSize: "320px 320px",
        }}
      />

      {/* 2. Brand radial wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-20"
        style={{
          backgroundImage: `
            radial-gradient(1100px 600px at 8% -10%, rgba(187,221,211,0.28), transparent 60%),
            radial-gradient(900px 600px at 110% 10%, rgba(231,158,174,0.22), transparent 60%),
            radial-gradient(700px 500px at 50% 110%, rgba(231,158,174,0.14), transparent 60%)
          `,
        }}
      />

      {/* 3. Drifting particles */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        {visibleItems.map((item, i) => (
          <Floater key={i} item={item} scrollY={scrollY} reduced={!!reduced} />
        ))}
      </div>
    </>
  );
}

// ---------- Particle ----------

function Floater({
  item,
  scrollY,
  reduced,
}: {
  item: FloatItem;
  scrollY: MotionValue<number>;
  reduced: boolean;
}) {
  // Negative parallax — elements drift up as the user scrolls down, slower
  // than the page itself, so they feel suspended above the content.
  const parallaxY = useTransform(
    scrollY,
    [0, 2000],
    [0, reduced ? 0 : -180 * item.parallax],
  );

  const Comp =
    item.type === "paw"
      ? Paw
      : item.type === "heart"
        ? Heart
        : item.type === "sparkle"
          ? Sparkle
          : Dot;

  return (
    <motion.div
      style={{
        top: item.top,
        left: item.left,
        width: item.size,
        height: item.size,
        y: parallaxY,
        // Promote each particle to its own compositor layer so the parallax
        // + continuous motion don't repaint the page surface underneath.
        willChange: "transform",
      }}
      className={`absolute ${item.color}`}
    >
      {/* Inner wrapper handles the continuous gentle motion */}
      <motion.div
        className="h-full w-full"
        initial={{ opacity: 0 }}
        animate={
          reduced
            ? { opacity: 1 }
            : {
                opacity: 1,
                y: [0, -18, 0],
                rotate: [item.rotate, item.rotate + 6, item.rotate],
              }
        }
        transition={{
          opacity: { duration: 1.4, delay: item.delay * 0.15 },
          y: {
            duration: item.duration,
            delay: item.delay,
            repeat: Infinity,
            ease: "easeInOut",
          },
          rotate: {
            duration: item.duration,
            delay: item.delay,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
      >
        <Comp className="h-full w-full" />
      </motion.div>
    </motion.div>
  );
}

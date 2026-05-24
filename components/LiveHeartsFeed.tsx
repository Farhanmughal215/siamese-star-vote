"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { cats as allCats } from "@/data/cats";

type LiveEntry = {
  id: number;
  emoji: string;
  /** Pre-rendered message with a bolded cat name embedded. */
  text: string;
  catName: string;
};

type LiveHeartsFeedProps = {
  /** When true, no new entries are added (current ones still age out). */
  paused?: boolean;
};

// Cute paw character used in messages — small enough to mix with text.
const PAW = "🐾";

// Message templates — cat name ALWAYS appears first for emotional pull
// and quick readability ("Lucy received another heart" reads more cozy
// than "Someone just supported Lucy"). {{cat}} is replaced at render time.
const TEMPLATES: Array<{ emoji: string; tpl: string }> = [
  { emoji: "💖", tpl: "{{cat}} received another heart" },
  { emoji: "🐾", tpl: "{{cat}} gained a new supporter" },
  { emoji: "✨", tpl: "{{cat}} is getting more love today" },
  { emoji: "💗", tpl: "{{cat}} received today's heart" },
  { emoji: "🐱", tpl: "{{cat}} gained another fan" },
  { emoji: "🌸", tpl: "{{cat}} just brightened someone's day" },
  { emoji: "💌", tpl: "{{cat}} earned a warm vote" },
  { emoji: "☕", tpl: "{{cat}} was cheered on by a café guest" },
];

// Interval bounds — randomised between 5s and 60s so toasts feel like
// real-life activity rather than a steady stream. Same range on both
// viewports; the difference between mobile/desktop is just stack size.
const INTERVAL_MIN_MS = 5_000;
const INTERVAL_MAX_MS = 60_000;

// Lifetime of each entry on screen — kept short so toasts feel like
// passing glimpses, not banners.
const ENTRY_TTL_MS = 3_000;

const MAX_DESKTOP = 3;
const MAX_MOBILE = 1;

const MOBILE_BREAKPOINT = 640;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Build a fresh entry, biased away from `recentCatNames` so the same cat
 * doesn't show up two/three times in a row. After a small number of retries
 * we accept whatever we got — guarantees we always return something even
 * if the candidate pool is tiny.
 *
 * `recentCatNames` defaults to [] so a stale HMR-cached call site that
 * forgets the second argument still works during dev reloads.
 */
function buildEntry(id: number, recentCatNames: string[] = []): LiveEntry {
  let cat = pickRandom(allCats);
  for (let i = 0; i < 6 && recentCatNames.includes(cat.name); i++) {
    cat = pickRandom(allCats);
  }
  const { emoji, tpl } = pickRandom(TEMPLATES);
  return {
    id,
    emoji,
    catName: cat.name,
    text: tpl.replace("{{cat}}", cat.name),
  };
}

// How many recent cats to remember when avoiding repeats. Higher = less
// repetition but starts excluding too many cats if the pool is small.
const ANTI_REPEAT_WINDOW = 3;

/**
 * Floating mock live-activity feed. Adds a small toast every few seconds with
 * a random "someone supported X" / "X received love" message. Old entries
 * automatically age out so the stack never grows.
 *
 * Desktop: bottom-left, up to 3 cards stacked, fairly active.
 * Mobile: single compact pill near the bottom, slower cadence.
 *
 * Pauses on `paused` prop (e.g., while a modal is open) and respects
 * prefers-reduced-motion (replaces slide with simple fade).
 */
export default function LiveHeartsFeed({ paused = false }: LiveHeartsFeedProps) {
  const reduced = useReducedMotion();
  const [entries, setEntries] = useState<LiveEntry[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const nextIdRef = useRef(1);
  // Tracks the most recent cat names (not just on-screen — older ones too)
  // so cats don't reappear too soon after aging out of the visible stack.
  const recentCatsRef = useRef<string[]>([]);

  // Track viewport size so we can size + pace the feed differently on mobile.
  useEffect(() => {
    const compute = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const maxVisible = isMobile ? MAX_MOBILE : MAX_DESKTOP;

  // Seed one entry shortly after mount so the feed isn't empty for the first
  // few seconds.
  useEffect(() => {
    if (paused) return;
    const seed = window.setTimeout(() => {
      setEntries((prev) => {
        if (prev.length > 0) return prev;
        const entry = buildEntry(nextIdRef.current++, recentCatsRef.current);
        recentCatsRef.current = [
          ...recentCatsRef.current,
          entry.catName,
        ].slice(-ANTI_REPEAT_WINDOW);
        return [entry];
      });
    }, 1500);
    return () => window.clearTimeout(seed);
  }, [paused]);

  // Add new entries on a self-scheduling timeout (lets us re-randomise the
  // delay each cycle without juggling intervals).
  useEffect(() => {
    if (paused) return;
    let cancelled = false;
    let handle: number | undefined;

    const schedule = () => {
      const delay =
        INTERVAL_MIN_MS + Math.random() * (INTERVAL_MAX_MS - INTERVAL_MIN_MS);
      handle = window.setTimeout(() => {
        if (cancelled) return;
        setEntries((prev) => {
          const next = buildEntry(nextIdRef.current++, recentCatsRef.current);
          recentCatsRef.current = [
            ...recentCatsRef.current,
            next.catName,
          ].slice(-ANTI_REPEAT_WINDOW);
          const merged = [...prev, next];
          // Keep only the newest N visible.
          return merged.slice(-maxVisible);
        });
        schedule();
      }, delay);
    };

    schedule();
    return () => {
      cancelled = true;
      if (handle) window.clearTimeout(handle);
    };
  }, [paused, maxVisible]);

  // Age out entries individually — each entry lives ENTRY_TTL_MS ms.
  useEffect(() => {
    if (entries.length === 0) return;
    const oldest = entries[0];
    const handle = window.setTimeout(() => {
      setEntries((prev) => prev.filter((e) => e.id !== oldest.id));
    }, ENTRY_TTL_MS);
    return () => window.clearTimeout(handle);
  }, [entries]);

  // Container layout differs by viewport: desktop = bottom-left column,
  // mobile = single compact pill, bottom-center.
  const containerClass = useMemo(
    () =>
      isMobile
        ? "pointer-events-none fixed bottom-3 left-1/2 z-30 w-[min(92vw,360px)] -translate-x-1/2 sm:hidden"
        : "pointer-events-none fixed bottom-6 left-6 z-30 hidden w-[280px] sm:block",
    [isMobile],
  );

  return (
    <div className={containerClass} aria-live="polite" aria-atomic="false">
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {entries.map((entry, idx) => (
            <FeedItem
              key={entry.id}
              entry={entry}
              reduced={!!reduced}
              isMobile={isMobile}
              // Older items in the stack get a touch smaller / dimmer.
              stackOffset={entries.length - 1 - idx}
            />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

// ============= Individual feed item =============

function FeedItem({
  entry,
  reduced,
  isMobile,
  stackOffset,
}: {
  entry: LiveEntry;
  reduced: boolean;
  isMobile: boolean;
  stackOffset: number;
}) {
  // Older items in the stack fade slightly and sit a hair smaller — gives
  // a sense of newer content being "on top".
  const opacity = 1 - Math.min(stackOffset, 2) * 0.18;
  const scale = 1 - Math.min(stackOffset, 2) * 0.025;

  const initial = reduced
    ? { opacity: 0 }
    : isMobile
      ? { opacity: 0, y: 20 }
      : { opacity: 0, x: -28 };

  const animate = reduced
    ? { opacity }
    : isMobile
      ? { opacity, y: 0, scale }
      : { opacity, x: 0, scale };

  const exit = reduced
    ? { opacity: 0 }
    : isMobile
      ? { opacity: 0, y: -16 }
      : { opacity: 0, x: -28 };

  return (
    <motion.li
      layout
      initial={initial}
      animate={animate}
      exit={exit}
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 26,
      }}
      className="pointer-events-auto"
    >
      <div
        className="
          flex items-center gap-2.5 rounded-full border border-brown/10
          bg-cream/85 px-3 py-2 shadow-soft backdrop-blur-md
          sm:gap-3 sm:px-3.5 sm:py-2.5
        "
        style={{
          boxShadow:
            "0 8px 22px -10px rgba(90,49,20,0.35), 0 0 0 1px rgba(255,255,255,0.4) inset",
        }}
      >
        {/* Tiny pulsing heart badge */}
        <span
          aria-hidden="true"
          className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, #fbd6df 0%, #e79eae 65%, #c46f83 100%)",
          }}
        >
          <Heart className="h-3.5 w-3.5 text-cream" fill="currentColor" strokeWidth={0} />
          {!reduced && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-full"
              style={{ background: "rgba(231,158,174,0.5)" }}
              initial={{ opacity: 0.5, scale: 0.6 }}
              animate={{ opacity: [0.5, 0, 0.5], scale: [0.6, 1.6, 0.6] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
        </span>

        {/* Text — emoji + message */}
        <p className="min-w-0 truncate text-[12px] leading-tight text-brown sm:text-[13px]">
          <span className="mr-1" aria-hidden="true">
            {entry.emoji}
          </span>
          <span className="text-brown/85">
            {entry.text.split(entry.catName).map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className="font-display font-bold text-brown">
                    {entry.catName}
                  </span>
                )}
              </span>
            ))}
          </span>
        </p>

        {/* Tiny paw flourish on the right */}
        <span aria-hidden="true" className="ml-auto text-[11px] text-pink-dark/70">
          {PAW}
        </span>
      </div>
    </motion.li>
  );
}

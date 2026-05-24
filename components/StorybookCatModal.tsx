"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  MessageCircle,
  Quote,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { Cat } from "@/lib/types";
import type { HeartedCatsMap } from "@/lib/voterStorage";
import {
  getAffectionLevelMeta,
  nextLevelThreshold,
  progressToNextLevel,
  type AffectionMap,
} from "@/lib/catAffection";
import { getCatDialogue } from "@/lib/catDialogues";
import CatDialogueBubble from "./CatDialogueBubble";

type StorybookCatModalProps = {
  cat: Cat | null;
  /** Ordered cats list — drives prev/next navigation. */
  cats: Cat[];
  /** Cats currently on the 5-hour cooldown — drives the storybook's Hearted state. */
  heartedCats?: HeartedCatsMap;
  /** Long-term per-cat affection — drives the relationship section. */
  catAffection?: AffectionMap;
  /** Voter's first name used in dialogue interpolation. */
  voterFirstName?: string | null;
  onClose: () => void;
  /**
   * Triggered by the "Give Heart" button inside the modal. For a cat that's
   * currently on cooldown, the parent uses this same callback to open the
   * cooldown info modal.
   */
  onGiveHeart: (cat: Cat) => void;
  /** Called when prev/next is clicked. Parent updates which cat is open. */
  onNavigate: (cat: Cat) => void;
  /** Optional: opens the AI cat-chat modal for this cat. */
  onStartChat?: (cat: Cat) => void;
};

// ---- Cat-to-cat page-turn variants ----

const pageVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 48 : -48,
    opacity: 0,
    rotate: dir > 0 ? 2 : -2,
  }),
  center: {
    x: 0,
    opacity: 1,
    rotate: 0,
    transition: { duration: 0.42, ease: [0.22, 0.78, 0.36, 1] as const },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -48 : 48,
    opacity: 0,
    rotate: dir > 0 ? -2 : 2,
    transition: { duration: 0.3, ease: "easeIn" as const },
  }),
};

// ---- Derive small stats from existing cat data ----

function deriveStats(cat: Cat) {
  // Personality often comes "X & Y" — split into mood / charm. Fall back
  // to the first tag when the second half isn't present.
  const parts = cat.personality.split(/\s*&\s*/).map((s) => s.trim());
  const mood = parts[0] || cat.personality || "Cozy";
  const charm = parts[1] || cat.tags[0] || "Cuddly";
  const loves = cat.favoriteThings[0] || "Quiet corners";
  return { mood, charm, loves };
}

// =================== Main modal ===================

export default function StorybookCatModal({
  cat,
  cats,
  heartedCats,
  catAffection,
  voterFirstName,
  onClose,
  onGiveHeart,
  onNavigate,
  onStartChat,
}: StorybookCatModalProps) {
  const reducedMotion = useReducedMotion();

  // Direction tracking for prev/next animations.
  const previousIdRef = useRef<number | null>(null);
  const directionRef = useRef(0);

  if (cat && previousIdRef.current !== cat.id) {
    if (previousIdRef.current !== null) {
      const prevIdx = cats.findIndex((c) => c.id === previousIdRef.current);
      const nextIdx = cats.findIndex((c) => c.id === cat.id);
      if (prevIdx >= 0 && nextIdx >= 0) {
        directionRef.current = nextIdx > prevIdx ? 1 : -1;
      }
    }
    previousIdRef.current = cat.id;
  }

  // Body scroll lock + Esc/← /→ shortcuts.
  useEffect(() => {
    if (!cat) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const idx = cats.findIndex((c) => c.id === cat.id);
    const prevCat = idx > 0 ? cats[idx - 1] : null;
    const nextCat = idx >= 0 && idx < cats.length - 1 ? cats[idx + 1] : null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && prevCat) onNavigate(prevCat);
      else if (e.key === "ArrowRight" && nextCat) onNavigate(nextCat);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [cat, cats, onClose, onNavigate]);

  const idx = cat ? cats.findIndex((c) => c.id === cat.id) : -1;
  const prevCat = idx > 0 ? cats[idx - 1] : null;
  const nextCat = idx >= 0 && idx < cats.length - 1 ? cats[idx + 1] : null;

  return (
    <AnimatePresence>
      {cat && (
        <motion.div
          key="storybook-root"
          className="fixed inset-0 z-50 flex items-end justify-center px-2 pb-2 pt-4 sm:items-center sm:p-4 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          aria-modal="true"
          role="dialog"
          aria-labelledby={`storybook-${cat.id}-title`}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-brown/55 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true"
          />

          {/* Desktop floating prev/next arrows (positioned around the panel) */}
          <FloatingNavArrow
            side="left"
            target={prevCat}
            onClick={() => prevCat && onNavigate(prevCat)}
          />
          <FloatingNavArrow
            side="right"
            target={nextCat}
            onClick={() => nextCat && onNavigate(nextCat)}
          />

          {/* Modal panel — soft page-turn opening */}
          <motion.div
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { y: 60, opacity: 0, scale: 0.96, rotateY: -8 }
            }
            animate={
              reducedMotion
                ? { opacity: 1 }
                : { y: 0, opacity: 1, scale: 1, rotateY: 0 }
            }
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { y: 40, opacity: 0, scale: 0.97, rotateY: 4 }
            }
            transition={{ type: "spring", stiffness: 220, damping: 25 }}
            style={{ transformPerspective: 1400 }}
            className="relative z-10 w-full max-w-[920px]"
          >
            <div
              className="
                relative overflow-hidden rounded-t-[28px] bg-cream
                sm:rounded-[32px]
              "
              style={{
                // Layered shadow: deep card + soft page-edge inset
                boxShadow:
                  "0 30px 90px -30px rgba(90,49,20,0.45), 0 0 0 1px rgba(90,49,20,0.06), inset 0 0 0 1px rgba(255,255,255,0.55)",
              }}
            >
              {/* Brand gradient stripe at top */}
              <div className="h-1.5 w-full bg-gradient-to-r from-mint via-pink to-pink-dark" />

              {/* Mobile grab handle */}
              <div
                aria-hidden="true"
                className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-brown/15 sm:hidden"
              />

              {/* Paper texture overlay */}
              <PaperTexture />

              {/* Faint paw watermarks */}
              <PawWatermark className="pointer-events-none absolute -left-8 -top-10 h-32 w-32 text-pink/12" />
              <PawWatermark className="pointer-events-none absolute -right-8 bottom-16 h-28 w-28 rotate-[18deg] text-mint-dark/18" />

              {/* Corner ornaments */}
              <CornerOrnament position="tl" />
              <CornerOrnament position="tr" />
              <CornerOrnament position="bl" />
              <CornerOrnament position="br" />

              {/* Close button — rotates on hover */}
              <motion.button
                type="button"
                onClick={onClose}
                aria-label="Close"
                whileHover={{ rotate: 90, scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
                className="absolute right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-brown shadow-soft transition-colors hover:bg-white"
              >
                <X className="h-4 w-4" strokeWidth={2.4} />
              </motion.button>

              {/* Scrollable content */}
              <div className="relative z-10 max-h-[88vh] overflow-y-auto overflow-x-hidden scrollbar-none">
                <AnimatePresence mode="wait" custom={directionRef.current}>
                  <motion.div
                    key={cat.id}
                    custom={directionRef.current}
                    variants={pageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="grid gap-0 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
                  >
                    <CatPortrait
                      cat={cat}
                      reducedMotion={!!reducedMotion}
                      currentIndex={idx}
                      totalCats={cats.length}
                    />
                    <ContentColumn
                      cat={cat}
                      hearted={!!heartedCats?.[String(cat.id)]}
                      affection={catAffection?.[String(cat.id)] ?? null}
                      voterFirstName={voterFirstName ?? null}
                      onGiveHeart={() => onGiveHeart(cat)}
                      onStartChat={
                        onStartChat ? () => onStartChat(cat) : undefined
                      }
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Mobile bottom nav row */}
                <MobileNavRow
                  prevCat={prevCat}
                  nextCat={nextCat}
                  onNavigate={onNavigate}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =================== Portrait column ===================

function CatPortrait({
  cat,
  reducedMotion,
  currentIndex,
  totalCats,
}: {
  cat: Cat;
  reducedMotion: boolean;
  currentIndex: number;
  totalCats: number;
}) {
  const stats = useMemo(() => deriveStats(cat), [cat]);
  return (
    <div className="relative flex flex-col px-6 pb-4 pt-6 sm:px-8 sm:pb-6 sm:pt-10">
      {/* Floating decorations around (outside) the frame */}
      <FloatingDecorationsAround />

      {/* Soft inner glow halo behind the frame */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-6 rounded-[28px] blur-2xl sm:inset-10"
        style={{
          background:
            "radial-gradient(closest-side, rgba(231,158,174,0.45), rgba(187,221,211,0.25) 50%, transparent 75%)",
        }}
      />

      {/* The portrait frame */}
      <motion.div
        animate={reducedMotion ? undefined : { y: [0, -4, 0] }}
        transition={
          reducedMotion
            ? undefined
            : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }
        }
        className="relative mx-auto w-full max-w-[320px] sm:max-w-none"
      >
        <div
          className="
            relative aspect-[1/1.1] w-full overflow-hidden rounded-[24px] border-2 border-cream
            bg-gradient-to-br from-mint-light via-cream to-pink-light
          "
          style={{
            boxShadow:
              "0 18px 50px -18px rgba(231,158,174,0.55), 0 0 0 6px rgba(255,255,255,0.6) inset",
          }}
        >
          <Image
            src={cat.image}
            alt={`${cat.name} — ${cat.title}`}
            fill
            sizes="(max-width: 640px) 100vw, 360px"
            className="object-cover"
            priority
          />

          {/* Image bottom gradient for legibility */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-brown/40 to-transparent"
          />

          {/* Candidate badge — premium pill */}
          <CandidateBadge rank={cat.rank} />
        </div>
      </motion.div>

      {/* Below the frame: stats row + page-chapter indicator. Fills the
          left column on desktop so it doesn't feel image-only. */}
      <div className="mx-auto mt-5 w-full max-w-[320px] sm:max-w-none">
        <StatsRow stats={stats} />
      </div>

      <ChapterIndicator
        currentIndex={currentIndex}
        totalCats={totalCats}
        catName={cat.name}
      />

      {/* Decorative divider — vertical on desktop, horizontal on mobile */}
      <DecorativeDivider />
    </div>
  );
}

function ChapterIndicator({
  currentIndex,
  totalCats,
  catName,
}: {
  currentIndex: number;
  totalCats: number;
  catName: string;
}) {
  const chapter = String(currentIndex + 1).padStart(2, "0");
  const total = String(totalCats).padStart(2, "0");
  return (
    <div className="relative mt-5 flex flex-col items-center gap-1 text-center">
      {/* Decorative line + paw + line */}
      <div className="flex w-full max-w-[260px] items-center gap-2">
        <span
          aria-hidden="true"
          className="h-px flex-1"
          style={{
            backgroundImage:
              "linear-gradient(to right, transparent, rgba(90,49,20,0.25), transparent)",
          }}
        />
        <span
          aria-hidden="true"
          className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-light/45 text-pink-dark"
        >
          <svg viewBox="0 0 64 64" className="h-3 w-3" fill="currentColor">
            <ellipse cx="32" cy="42" rx="14" ry="11" />
            <ellipse cx="14" cy="26" rx="6" ry="8" />
            <ellipse cx="50" cy="26" rx="6" ry="8" />
            <ellipse cx="22" cy="12" rx="5" ry="7" />
            <ellipse cx="42" cy="12" rx="5" ry="7" />
          </svg>
        </span>
        <span
          aria-hidden="true"
          className="h-px flex-1"
          style={{
            backgroundImage:
              "linear-gradient(to right, transparent, rgba(90,49,20,0.25), transparent)",
          }}
        />
      </div>

      <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-brown/65">
        Chapter {chapter}{" "}
        <span className="font-normal text-brown/40">of</span> {total}
      </p>
      <p className="font-display text-xs italic text-pink-dark">
        — {catName}
      </p>
    </div>
  );
}

function CandidateBadge({ rank }: { rank: number }) {
  return (
    <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-cream/95 px-2.5 py-1 shadow-card backdrop-blur">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-pink to-pink-dark text-cream shadow-soft">
        <Sparkles className="h-2.5 w-2.5" strokeWidth={2.6} />
      </span>
      <span className="flex items-baseline gap-1">
        <span className="font-display text-[9px] font-bold uppercase tracking-[0.18em] text-brown/65">
          Candidate
        </span>
        <span className="font-display text-[13px] font-bold text-brown">
          #{rank}
        </span>
      </span>
    </div>
  );
}

function FloatingDecorationsAround() {
  // Tiny hearts/sparkles around the portrait frame.
  const items = [
    { top: "8%",  left: "2%",   size: 12, delay: 0,   type: "heart"   as const, color: "text-pink-dark/55" },
    { top: "14%", left: "92%",  size: 14, delay: 0.4, type: "sparkle" as const, color: "text-pink/70" },
    { top: "46%", left: "-2%",  size: 10, delay: 0.9, type: "sparkle" as const, color: "text-mint-dark/65" },
    { top: "62%", left: "94%",  size: 12, delay: 0.2, type: "heart"   as const, color: "text-pink/55" },
    { top: "84%", left: "8%",   size: 10, delay: 0.7, type: "sparkle" as const, color: "text-pink-dark/55" },
    { top: "78%", left: "84%",  size: 11, delay: 1.1, type: "heart"   as const, color: "text-mint-dark/55" },
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {items.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute ${p.color}`}
          style={{ top: p.top, left: p.left, width: p.size, height: p.size }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{
            opacity: [0, 1, 0.7, 1, 0],
            y: [0, -6, 0],
            scale: [0.4, 1.15, 1, 1.1, 0.6],
          }}
          transition={{
            duration: 3.8,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
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

function DecorativeDivider() {
  return (
    <>
      {/* Vertical divider (desktop) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-px top-12 bottom-10 hidden w-px sm:block"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, transparent 0%, rgba(90,49,20,0.18) 22%, rgba(90,49,20,0.18) 78%, transparent 100%)",
        }}
      />
      {/* Small heart marker on the divider — desktop */}
      <div
        aria-hidden="true"
        className="absolute -right-2 top-1/2 hidden -translate-y-1/2 sm:block"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cream text-pink-dark shadow-soft">
          <Heart className="h-2.5 w-2.5" fill="currentColor" strokeWidth={0} />
        </span>
      </div>

      {/* Horizontal divider (mobile) — appears between portrait and content */}
      <div
        aria-hidden="true"
        className="mt-4 flex items-center gap-2 sm:hidden"
      >
        <span
          className="h-px flex-1"
          style={{
            backgroundImage:
              "linear-gradient(to right, transparent, rgba(90,49,20,0.2), transparent)",
          }}
        />
        <Heart className="h-3 w-3 text-pink-dark" fill="currentColor" strokeWidth={0} />
        <span
          className="h-px flex-1"
          style={{
            backgroundImage:
              "linear-gradient(to right, transparent, rgba(90,49,20,0.2), transparent)",
          }}
        />
      </div>
    </>
  );
}

// =================== Content column ===================

function ContentColumn({
  cat,
  hearted,
  affection,
  voterFirstName,
  onGiveHeart,
  onStartChat,
}: {
  cat: Cat;
  hearted: boolean;
  affection: { heartsGiven: number; affectionLevel: number } | null;
  voterFirstName: string | null;
  onGiveHeart: () => void;
  onStartChat?: () => void;
}) {
  // Pick a dialogue line once per (cat, voter) — stable while the modal is
  // open, so the cat doesn't switch what they say between renders.
  const dialogue = useMemo(
    () =>
      getCatDialogue({
        cat,
        context: "profile",
        voterFirstName,
        affectionLevel: (affection?.affectionLevel ?? 0) as 0 | 1 | 2 | 3 | 4 | 5,
      }),
    [cat, voterFirstName, affection?.affectionLevel],
  );

  return (
    <div className="relative flex flex-col gap-4 px-5 pb-6 pt-3 sm:px-7 sm:pb-8 sm:pt-10">
      {/* Header */}
      <div>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-pink/18 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-dark">
          <Sparkles className="h-3 w-3" strokeWidth={2.6} />
          Cat Mayor Candidate
        </p>
        <h2
          id={`storybook-${cat.id}-title`}
          className="mt-2 font-display text-[30px] font-bold leading-[1.05] text-brown sm:text-[36px]"
        >
          {cat.name}
        </h2>
        <p className="mt-0.5 font-display text-base italic text-pink-dark sm:text-lg">
          {cat.title}
        </p>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-mint/40 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brown-400">
          {cat.personality}
        </span>
      </div>

      {/* The cat speaks to the visitor */}
      <CatDialogueBubble text={dialogue} />

      {/* Quote */}
      <QuoteSection quote={cat.quote} />

      {/* Affection / relationship section — only after first heart */}
      {affection && affection.heartsGiven > 0 && (
        <AffectionSection
          catName={cat.name}
          heartsGiven={affection.heartsGiven}
          affectionLevel={
            (affection.affectionLevel ?? 0) as 0 | 1 | 2 | 3 | 4 | 5
          }
        />
      )}

      {/* Traits */}
      <TraitsSection tags={cat.tags} />

      {/* Favorite things */}
      <FavoriteThingsSection items={cat.favoriteThings} />

      {/* Story preview */}
      <StoryPreviewSection text={cat.description} />

      {/* Action area */}
      <ActionArea
        cat={cat}
        hearted={hearted}
        onGiveHeart={onGiveHeart}
        onStartChat={onStartChat}
      />
    </div>
  );
}

function StatsRow({
  stats,
}: {
  stats: { mood: string; charm: string; loves: string };
}) {
  const items = [
    { label: "Mood", value: stats.mood },
    { label: "Charm", value: stats.charm },
    { label: "Loves", value: stats.loves },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((s) => (
        <div
          key={s.label}
          className="flex min-w-0 flex-col rounded-2xl border border-brown/10 bg-white/70 px-3 py-2 text-center shadow-sm backdrop-blur"
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-brown/55">
            {s.label}
          </span>
          <span className="mt-0.5 truncate font-display text-[13px] font-bold leading-tight text-brown">
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function QuoteSection({ quote }: { quote: string }) {
  return (
    <figure className="relative rounded-2xl border border-pink-dark/15 bg-white/60 px-4 py-3 shadow-sm backdrop-blur">
      <Quote
        className="absolute -left-1.5 -top-1.5 h-4 w-4 rotate-180 text-pink-dark/50"
        fill="currentColor"
        strokeWidth={0}
        aria-hidden="true"
      />
      <blockquote className="relative font-display text-[14px] italic leading-relaxed text-brown sm:text-[15px]">
        {quote}
      </blockquote>
    </figure>
  );
}

function TraitsSection({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div>
      <SectionLabel>Personality Traits</SectionLabel>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <motion.span
            key={t}
            whileHover={{ scale: 1.05, y: -1 }}
            transition={{ type: "spring", stiffness: 380, damping: 20 }}
            className="inline-flex cursor-default items-center gap-1 rounded-full border border-pink-dark/25 bg-pink-light/30 px-3 py-1 text-[11px] font-semibold text-brown"
          >
            <Sparkles className="h-3 w-3 text-pink-dark" strokeWidth={2.5} />
            {t}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function FavoriteThingsSection({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <SectionLabel>Favorite Things</SectionLabel>
      <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {items.map((it, i) => (
          <motion.li
            key={i}
            whileHover={{ scale: 1.03, x: 2 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="flex cursor-default items-center gap-2 rounded-xl bg-white/55 px-3 py-1.5 text-[13px] text-brown/85 shadow-sm backdrop-blur transition-colors hover:bg-pink-light/30"
          >
            <PawDot />
            <span className="truncate">{it}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function AffectionSection({
  catName,
  heartsGiven,
  affectionLevel,
}: {
  catName: string;
  heartsGiven: number;
  affectionLevel: 0 | 1 | 2 | 3 | 4 | 5;
}) {
  const meta = getAffectionLevelMeta(affectionLevel);
  const progress = progressToNextLevel(heartsGiven);
  const nextThreshold = nextLevelThreshold(affectionLevel);
  const heartsToNext =
    nextThreshold !== null ? Math.max(0, nextThreshold - heartsGiven) : 0;

  return (
    <div className="rounded-2xl border border-pink-dark/15 bg-gradient-to-br from-pink-light/35 via-cream to-mint-light/35 px-4 py-3 shadow-sm">
      <SectionLabel>Your Bond</SectionLabel>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-baseline gap-2">
            <span className="font-display text-base font-bold text-brown sm:text-lg">
              {meta.emoji} {meta.label}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brown/55">
              Lv {affectionLevel}
            </span>
          </p>
          <p className="text-[12px] text-brown/65">
            {heartsGiven} {heartsGiven === 1 ? "heart" : "hearts"} shared with{" "}
            <span className="font-semibold text-brown">{catName}</span>
          </p>
        </div>
        {nextThreshold !== null && (
          <p className="shrink-0 text-right text-[10px] font-semibold uppercase tracking-wider text-brown/55">
            {heartsToNext} to
            <br />
            next level
          </p>
        )}
      </div>

      {/* Progress bar */}
      {nextThreshold !== null ? (
        <div className="mt-2.5">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/70 shadow-inner">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-pink to-pink-dark"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-2.5 rounded-full bg-pink-dark/15 px-3 py-1 text-center text-[11px] font-semibold text-brown">
          You&apos;ve reached the deepest bond 💖
        </div>
      )}

      <p className="mt-2 text-[11.5px] italic text-brown/65">
        {catName} is getting closer to you 🐾
      </p>
    </div>
  );
}

function StoryPreviewSection({ text }: { text: string }) {
  return (
    <div>
      <SectionLabel>From the Cat Council Diary</SectionLabel>
      <p className="mt-2 text-[14px] leading-relaxed text-brown/80 sm:text-[15px]">
        {text}
      </p>
    </div>
  );
}

function ActionArea({
  cat,
  hearted,
  onGiveHeart,
  onStartChat,
}: {
  cat: Cat;
  hearted: boolean;
  onGiveHeart: () => void;
  onStartChat?: () => void;
}) {
  return (
    <div className="mt-1 flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr]">
        {/* Primary — Give Heart, or Hearted (clickable → cooldown modal) */}
        <motion.button
          type="button"
          onClick={onGiveHeart}
          initial="rest"
          whileHover={hearted ? undefined : "hover"}
          whileTap={{ scale: 0.97 }}
          aria-label={
            hearted
              ? `You already gave ${cat.name} a heart — tap to see when you can support them again`
              : `Give heart to ${cat.name}`
          }
          className={`group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-5 py-3.5 text-sm font-semibold transition ${
            hearted
              ? "bg-pink-dark text-cream shadow-glow"
              : "bg-brown text-cream shadow-soft hover:bg-brown-400 hover:shadow-card"
          }`}
        >
          {/* Sliding highlight on hover — interactive state only */}
          {!hearted && (
            <span
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
          )}
          <Heart className="h-4 w-4" fill="currentColor" strokeWidth={0} />
          <span className="relative">{hearted ? "Hearted" : "Give Heart"}</span>
          {!hearted && (
            <motion.span
              aria-hidden="true"
              className="relative text-pink-light"
              variants={{
                rest: { opacity: 0, rotate: 0, scale: 0.6 },
                hover: { opacity: 1, rotate: 360, scale: 1 },
              }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            </motion.span>
          )}
        </motion.button>

        {/* Secondary — Read Full Story */}
        <a
          href={cat.storyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-brown/15 bg-white/80 px-5 py-3 text-sm font-semibold text-brown transition hover:border-brown/40 hover:bg-white active:scale-[0.98]"
        >
          <BookOpen className="h-4 w-4" strokeWidth={2.2} />
          Read Full Story
          <ExternalLink className="h-3.5 w-3.5 text-brown/60" strokeWidth={2.2} />
        </a>
      </div>

      {/* Chat with the cat — magical little wow moment */}
      {onStartChat && (
        <button
          type="button"
          onClick={onStartChat}
          className="group mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full border border-pink-dark/25 bg-gradient-to-r from-pink-light/45 via-cream to-mint-light/40 px-4 py-2.5 text-[13px] font-semibold text-brown shadow-sm transition hover:border-pink-dark/45 hover:shadow-soft"
        >
          <MessageCircle
            className="h-4 w-4 text-pink-dark transition group-hover:scale-110"
            strokeWidth={2.4}
          />
          Chat with {cat.name}
          <span className="rounded-full bg-pink-dark px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cream">
            New
          </span>
        </button>
      )}

      {/* Support copy — single static line in both states; the cooldown
          countdown is only shown inside the CatCooldownModal. */}
      <p className="mt-1 text-center text-[11px] text-brown/55">
        Your daily heart helps support our rescue cats.
      </p>
    </div>
  );
}

// =================== Navigation ===================

function FloatingNavArrow({
  side,
  target,
  onClick,
}: {
  side: "left" | "right";
  target: Cat | null;
  onClick: () => void;
}) {
  if (!target) return null;
  const isLeft = side === "left";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={isLeft ? "Previous cat" : "Next cat"}
      whileHover={{ scale: 1.08, x: isLeft ? -2 : 2 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={`
        absolute z-20 hidden h-12 w-12 items-center justify-center rounded-full
        border border-brown/10 bg-cream/95 text-brown shadow-card backdrop-blur
        sm:flex
        ${isLeft ? "left-3 lg:left-6" : "right-3 lg:right-6"}
        top-1/2 -translate-y-1/2
      `}
    >
      {isLeft ? (
        <ChevronLeft className="h-5 w-5" strokeWidth={2.6} />
      ) : (
        <ChevronRight className="h-5 w-5" strokeWidth={2.6} />
      )}
    </motion.button>
  );
}

function MobileNavRow({
  prevCat,
  nextCat,
  onNavigate,
}: {
  prevCat: Cat | null;
  nextCat: Cat | null;
  onNavigate: (cat: Cat) => void;
}) {
  return (
    <div className="relative z-10 border-t border-brown/10 bg-cream/85 px-4 py-3 backdrop-blur sm:hidden">
      <div className="flex items-center justify-between gap-2">
        <MobileNavButton
          dir="prev"
          target={prevCat}
          onClick={() => prevCat && onNavigate(prevCat)}
        />
        <MobileNavButton
          dir="next"
          target={nextCat}
          onClick={() => nextCat && onNavigate(nextCat)}
        />
      </div>
    </div>
  );
}

function MobileNavButton({
  dir,
  target,
  onClick,
}: {
  dir: "prev" | "next";
  target: Cat | null;
  onClick: () => void;
}) {
  const disabled = !target;
  const isPrev = dir === "prev";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrev ? "Previous cat" : "Next cat"}
      className={`group inline-flex max-w-[48%] flex-1 items-center gap-2 rounded-full px-3 py-2 text-left transition ${
        disabled
          ? "cursor-not-allowed opacity-40"
          : "bg-white/70 hover:bg-white"
      } ${isPrev ? "flex-row" : "flex-row-reverse text-right"}`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brown text-cream shadow-soft transition group-hover:bg-brown-400 ${
          disabled ? "opacity-60" : ""
        }`}
      >
        {isPrev ? (
          <ChevronLeft className="h-4 w-4" strokeWidth={2.6} />
        ) : (
          <ChevronRight className="h-4 w-4" strokeWidth={2.6} />
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-brown/55">
          {isPrev ? "Previous" : "Next"}
        </span>
        <span className="block truncate font-display text-sm font-bold text-brown">
          {target ? target.name : "—"}
        </span>
      </span>
    </button>
  );
}

// =================== Small helpers ===================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brown/55">
      {children}
    </p>
  );
}

function PawDot() {
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-light/55 text-pink-dark"
    >
      <svg viewBox="0 0 64 64" className="h-3 w-3" fill="currentColor">
        <ellipse cx="32" cy="42" rx="14" ry="11" />
        <ellipse cx="14" cy="26" rx="6" ry="8" />
        <ellipse cx="50" cy="26" rx="6" ry="8" />
        <ellipse cx="22" cy="12" rx="5" ry="7" />
        <ellipse cx="42" cy="12" rx="5" ry="7" />
      </svg>
    </span>
  );
}

function PawWatermark({ className = "" }: { className?: string }) {
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

function PaperTexture() {
  // Higher-contrast paper noise than before — still subtle, but reads as
  // texture even at small sizes.
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.09] mix-blend-multiply"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.353 0 0 0 0 0.192 0 0 0 0 0.078 0 0 0 0.7 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}

function CornerOrnament({
  position,
}: {
  position: "tl" | "tr" | "bl" | "br";
}) {
  // Tiny ornamental flourish — short curve + dot. Renders in all 4 corners
  // rotated/mirrored appropriately.
  const className = {
    tl: "top-3 left-3",
    tr: "top-3 right-3 scale-x-[-1]",
    bl: "bottom-3 left-3 scale-y-[-1]",
    br: "bottom-3 right-3 scale-x-[-1] scale-y-[-1]",
  }[position];

  return (
    <div
      className={`pointer-events-none absolute ${className} z-10 text-brown/25`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      >
        {/* Soft L-curve flourish */}
        <path d="M3 21 Q3 12 12 12 Q21 12 21 3" />
        <circle cx="3" cy="21" r="1.4" fill="currentColor" />
        <circle cx="21" cy="3" r="1" fill="currentColor" />
      </svg>
    </div>
  );
}

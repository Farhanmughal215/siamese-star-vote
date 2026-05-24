"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { BookOpen, Heart, Sparkles } from "lucide-react";
import { memo, useRef } from "react";
import SparkleBurst from "./SparkleBurst";
import type { Cat } from "@/lib/types";
import type { AffectionLevel } from "@/lib/catAffection";

export type GiveHeartContext = {
  buttonRect: DOMRect;
  cardRect: DOMRect;
};

type CatCardProps = {
  cat: Cat;
  index: number;
  /** This cat is currently on a 5-hour cooldown — show "Hearted" pink-dark. */
  hearted: boolean;
  /** Long-term affection level (0 if user has never hearted this cat). */
  affectionLevel?: AffectionLevel;
  /** Total hearts given to this cat across all time. */
  heartsGiven?: number;
  /** True while the page-level Give-Heart animation targets this card. */
  isAnimating?: boolean;
  onView: (cat: Cat) => void;
  /**
   * Called when the user clicks "Give Heart". The card passes its own
   * bounding rect plus the button rect so the parent can animate a
   * heart from the button into the cat image.
   *
   * For a hearted (cooldown) card, the parent uses this same callback to
   * open the cooldown info modal instead of starting the vote flow.
   */
  onGiveHeart: (cat: Cat, ctx?: GiveHeartContext) => void;
};

// Reaction starts when the flying heart lands (~500ms after click).
const REACT_DELAY_S = 0.5;

function CatCardInner({
  cat,
  index,
  hearted,
  isAnimating = false,
  onView,
  onGiveHeart,
}: CatCardProps) {
  const articleRef = useRef<HTMLElement>(null);
  const giveHeartButtonRef = useRef<HTMLButtonElement>(null);

  const handleGiveHeart = () => {
    if (isAnimating) return;
    if (hearted) {
      // Cooldown card — no flying-heart animation, just let the parent
      // open the cooldown info modal.
      onGiveHeart(cat);
      return;
    }
    const buttonRect = giveHeartButtonRef.current?.getBoundingClientRect();
    const cardRect = articleRef.current?.getBoundingClientRect();
    if (buttonRect && cardRect) {
      onGiveHeart(cat, { buttonRect, cardRect });
    } else {
      onGiveHeart(cat);
    }
  };

  return (
    <motion.article
      ref={articleRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.45,
        delay: Math.min(index, 12) * 0.04,
        ease: "easeOut",
      }}
      // Reaction animation kicks in only when the flying heart has landed
      // — the delay above the click moment lines up with FlyingHeart's flight.
      animate={
        isAnimating
          ? {
              y: [0, -10, -4, 0],
              rotate: [0, -2.5, 2.5, 0],
              transition: { duration: 0.55, delay: REACT_DELAY_S, ease: "easeOut" },
            }
          : undefined
      }
      whileHover={isAnimating ? undefined : { y: -5 }}
      whileTap={isAnimating ? undefined : { scale: 0.985 }}
      className={`group relative flex flex-col overflow-hidden rounded-3xl transition-all duration-300 ${
        hearted
          ? "ring-2 ring-pink-dark shadow-glow"
          : "shadow-card hover:shadow-glow"
      }`}
    >
      {/* Card surface — pink/mint tint when this cat is on cooldown */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-10 rounded-3xl transition-colors duration-500 ${
          hearted
            ? "bg-gradient-to-br from-pink-light/60 via-white to-mint-light/60"
            : "bg-gradient-to-br from-white to-cream"
        }`}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 rounded-3xl border border-brown/8"
      />

      {/* Reaction glow ring — fades in after the heart lands */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 rounded-3xl ring-2 ring-pink-dark/55"
            style={{
              boxShadow:
                "0 0 32px 6px rgba(231,158,174,0.55), inset 0 0 28px rgba(187,221,211,0.4)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.85,
              delay: REACT_DELAY_S,
              ease: "easeOut",
              times: [0, 0.2, 0.7, 1],
            }}
          />
        )}
      </AnimatePresence>

      {/* Ranking badge */}
      <span className="badge-rank text-xs">#{cat.rank}</span>

      {/* Top-right heart pill — always the same shape; the heart inside
          fills in when this cat is on the user's cooldown ("Hearted"). */}
      <span
        aria-hidden="true"
        className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-pink-dark shadow-soft backdrop-blur transition-transform group-hover:scale-110"
      >
        <Heart
          className="h-3.5 w-3.5"
          strokeWidth={2.2}
          fill={hearted ? "currentColor" : "none"}
        />
      </span>

      {/* Image — squareish for collectible feel */}
      <button
        type="button"
        onClick={() => onView(cat)}
        className="relative block aspect-[1/1.1] w-full overflow-hidden bg-gradient-to-br from-mint-light via-cream to-pink-light"
        aria-label={`View ${cat.name}'s story`}
      >
        {/* Image zoom is delayed to match the heart-landing moment */}
        <motion.div
          className="absolute inset-0"
          animate={
            isAnimating
              ? {
                  scale: [1, 1.1, 1.04, 1],
                  transition: { duration: 0.6, delay: REACT_DELAY_S, ease: "easeOut" },
                }
              : { scale: 1 }
          }
        >
          <Image
            src={cat.image}
            alt={`${cat.name} — ${cat.title}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 20vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            priority={index < 5}
          />
        </motion.div>

        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-brown/30 to-transparent"
        />

        {/* Sparkle burst — only renders during the animation, with the same delay */}
        {isAnimating && <SparkleBurst delay={REACT_DELAY_S} />}
      </button>

      {/* Body — compact, tighter padding for 5-up fit */}
      <div className="flex flex-1 flex-col gap-2.5 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
        <div className="min-h-0">
          <h3 className="truncate font-display text-lg font-bold leading-tight text-brown">
            {cat.name}
          </h3>
          <p className="truncate text-xs italic text-pink-dark">{cat.title}</p>
        </div>

        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-mint/35 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brown-400">
          <Sparkles className="h-3 w-3" strokeWidth={2.4} />
          {cat.personality}
        </span>

        {/* Actions — Give Heart / Hearted primary, View Story secondary */}
        <div className="mt-auto flex flex-col gap-1.5 pt-1">
          <motion.button
            ref={giveHeartButtonRef}
            type="button"
            onClick={handleGiveHeart}
            disabled={isAnimating}
            whileTap={isAnimating ? undefined : { scale: 0.96 }}
            aria-label={
              hearted
                ? `You already gave ${cat.name} a heart — tap to see when you can support them again`
                : `Give heart to ${cat.name}`
            }
            className={`inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-90 ${
              hearted
                ? "bg-pink-dark text-cream shadow-glow"
                : "bg-brown text-cream hover:bg-brown-400 hover:shadow-soft"
            }`}
          >
            <Heart
              className="h-3.5 w-3.5"
              strokeWidth={2.2}
              fill={hearted ? "currentColor" : "none"}
            />
            {hearted ? "Hearted" : "Give Heart"}
          </motion.button>

          <button
            type="button"
            onClick={() => onView(cat)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-brown/15 bg-white/75 px-3 py-2 text-[11px] font-semibold text-brown transition hover:border-brown/40 hover:bg-white active:scale-[0.98]"
          >
            <BookOpen className="h-3 w-3" strokeWidth={2.2} />
            View Story
          </button>
        </div>
      </div>
    </motion.article>
  );
}

// Memo wrapper — when handlers are stable (parent useCallback) and the cat
// object reference doesn't change, cards skip re-render entirely. Big win
// when the page re-renders for unrelated reasons (search input, filter
// chip, vote pulses, etc.).
const CatCard = memo(CatCardInner);
export default CatCard;

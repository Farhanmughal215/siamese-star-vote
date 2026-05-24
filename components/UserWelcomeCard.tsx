"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { BookOpen, Heart, Share2, Sparkles } from "lucide-react";
import { useMemo } from "react";
import type { Cat } from "@/lib/types";
import type { LastVote, VoterProfile } from "@/lib/voterStorage";
import { getSupporterLevel } from "@/lib/visitorStats";

type UserWelcomeCardProps = {
  voter: VoterProfile;
  /** The cat the voter most recently voted for (if any). null = no vote yet. */
  votedCat: Cat | null;
  /** Their persisted favorite cat (= last vote ever). May be the same as votedCat. */
  favoriteCat: Cat | null;
  /** Most recent vote record, used to decide "returning visitor" copy. */
  lastVote: LastVote | null;
  /** Total votes cast on this device — drives the supporter level chip. */
  totalVotes?: number;
  onShare?: (cat: Cat) => void;
  /** Opens the Cat Memory Book modal. */
  onOpenMemoryBook?: () => void;
};

// ---------- Headline templates ----------
//
// Fixed copy that matches the per-cat-cooldown brief. No global "you can't
// vote anymore" framing — every line reinforces that the user can keep
// supporting other cats.

const PRE_VOTE_LINE = "You can support more cats today.";
const POST_VOTE_TEMPLATE = "Thanks for supporting {cat} 💖";
const POST_VOTE_SUBLINE = "You can still give hearts to other cats.";

/**
 * Compact personalized welcome card. Three modes:
 *  - New profile, no vote yet:    "Welcome, {name} 🐾" + new-user nudge
 *  - Returning, hasn't voted today: "Welcome back, {name} 🐾" + returning message
 *  - Voted: "Welcome back" eyebrow + thanks line + countdown + favorite chip
 */
export default function UserWelcomeCard({
  voter,
  votedCat,
  favoriteCat,
  lastVote,
  totalVotes = 0,
  onShare,
  onOpenMemoryBook,
}: UserWelcomeCardProps) {
  const firstName = voter.name.trim().split(" ")[0] || voter.name;
  const initial = firstName.charAt(0).toUpperCase();
  const isReturning = lastVote !== null;
  const level = getSupporterLevel(totalVotes);

  // Fixed copy — no longer randomised. The per-cat cooldown means there's
  // no global "you can't vote today" state to communicate.
  const mainLine = useMemo(() => {
    if (votedCat) {
      return POST_VOTE_TEMPLATE.replace("{cat}", votedCat.name);
    }
    return PRE_VOTE_LINE;
  }, [votedCat]);

  const greeting = isReturning ? `Welcome back, ${firstName}` : `Welcome, ${firstName}`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative mx-auto mt-5 max-w-7xl px-4 sm:px-6"
      aria-label="Your voting status"
    >
      <div className="card-surface relative flex flex-col gap-3 overflow-hidden rounded-3xl px-4 py-4 shadow-card sm:flex-row sm:items-center sm:gap-5 sm:px-6 sm:py-5">
        {/* Soft brand wash */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-mint-light/45 via-transparent to-pink-light/40"
        />

        {/* Subtle outer glow on returning visitors with a vote */}
        {votedCat && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{
              boxShadow: "inset 0 0 40px 0 rgba(231,158,174,0.18)",
            }}
          />
        )}

        {/* Avatar — flips between user-initial and the voted cat */}
        <div className="relative shrink-0">
          {votedCat ? (
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border-2 border-cream bg-gradient-to-br from-mint-light via-cream to-pink-light shadow-soft sm:h-16 sm:w-16">
              <Image
                src={votedCat.image}
                alt={votedCat.name}
                fill
                sizes="64px"
                className="object-cover"
              />
              <span
                aria-hidden="true"
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-pink to-pink-dark shadow-card"
              >
                <Heart
                  className="h-3 w-3 text-cream"
                  fill="currentColor"
                  strokeWidth={0}
                />
              </span>
            </div>
          ) : (
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink to-pink-dark text-cream shadow-card sm:h-16 sm:w-16">
              <span className="font-display text-2xl font-bold">{initial}</span>
              <span
                aria-hidden="true"
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-mint shadow-soft"
              >
                <svg viewBox="0 0 64 64" className="h-3 w-3" fill="#5a3114">
                  <ellipse cx="32" cy="42" rx="14" ry="11" />
                  <ellipse cx="14" cy="26" rx="6" ry="8" />
                  <ellipse cx="50" cy="26" rx="6" ry="8" />
                  <ellipse cx="22" cy="12" rx="5" ry="7" />
                  <ellipse cx="42" cy="12" rx="5" ry="7" />
                </svg>
              </span>
            </div>
          )}
        </div>

        {/* Text block */}
        <div className="relative min-w-0 flex-1">
          {/* Small always-visible welcome line + supporter level pill */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="flex items-center gap-1 text-[11px] font-semibold text-brown/55 sm:text-xs">
              <Sparkles
                className="h-3 w-3 text-pink-dark"
                strokeWidth={2.4}
                aria-hidden="true"
              />
              <span>{greeting}</span>
              <span className="ml-0.5" aria-hidden="true">
                🐾
              </span>
            </p>
            {totalVotes > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-pink/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-dark">
                <span aria-hidden="true">{level.emoji}</span>
                {level.label}
              </span>
            )}
          </div>

          {/* Main line — mode-driven */}
          <h2 className="mt-1 font-display text-lg font-bold leading-tight text-brown sm:text-xl">
            {mainLine}
          </h2>

          {/* Sub-line: reassures the user that other cats are still open
              for hearts (post-vote), or shows the favorite cat chip / nudge
              before any vote this session. */}
          {votedCat ? (
            <p className="mt-1 text-[12px] text-brown/65 sm:text-[13px]">
              {POST_VOTE_SUBLINE}
            </p>
          ) : favoriteCat ? (
            <FavoriteCatPill cat={favoriteCat} />
          ) : (
            <p className="mt-1 text-[12px] text-brown/65 sm:text-[13px]">
              Browse the candidates below to start your daily ritual.
            </p>
          )}
        </div>

        {/* Right-side actions — Memory Book is always available once the
            user has a profile; Share appears after their most recent vote. */}
        <div className="flex w-full shrink-0 flex-col gap-1.5 sm:w-auto sm:flex-row sm:items-center">
          {onOpenMemoryBook && (
            <motion.button
              type="button"
              onClick={onOpenMemoryBook}
              whileTap={{ scale: 0.96 }}
              aria-label="Open your cat memory book"
              className="relative inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-brown/15 bg-white/80 px-4 py-2 text-xs font-semibold text-brown shadow-soft transition hover:border-brown/40 hover:bg-white sm:w-auto"
            >
              <BookOpen className="h-3.5 w-3.5 text-pink-dark" strokeWidth={2.4} />
              Memory Book
            </motion.button>
          )}
          {votedCat && onShare && (
            <motion.button
              type="button"
              onClick={() => onShare(votedCat)}
              whileTap={{ scale: 0.96 }}
              className="relative inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brown px-4 py-2 text-xs font-semibold text-cream shadow-soft transition hover:bg-brown-400 sm:w-auto"
            >
              <Share2 className="h-3.5 w-3.5" strokeWidth={2.4} />
              Share Vote
            </motion.button>
          )}
        </div>
      </div>
    </motion.section>
  );
}

// ---------- Favorite cat chip ----------

function FavoriteCatPill({ cat }: { cat: Cat }) {
  return (
    <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-brown/10 bg-white/70 py-1 pl-1 pr-3 backdrop-blur">
      <div className="relative h-6 w-6 overflow-hidden rounded-full bg-gradient-to-br from-mint-light via-cream to-pink-light">
        <Image
          src={cat.image}
          alt={cat.name}
          fill
          sizes="24px"
          className="object-cover"
        />
      </div>
      <span className="text-[11px] font-semibold text-brown/65">
        Your Favorite Cat:
      </span>
      <span className="font-display text-[12px] font-bold text-brown">
        {cat.name}
      </span>
      <motion.span
        aria-hidden="true"
        className="text-pink-dark"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Heart className="h-3 w-3" fill="currentColor" strokeWidth={0} />
      </motion.span>
    </div>
  );
}

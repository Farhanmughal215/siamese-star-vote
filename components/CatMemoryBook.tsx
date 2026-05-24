"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import {
  BookOpen,
  Crown,
  Gift,
  Heart,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  favoriteCatIdFromAffection,
  getAffectionLevelMeta,
  totalHeartsAcrossCats,
  type AffectionMap,
  type CatAffection,
} from "@/lib/catAffection";
import { getCatDialogue } from "@/lib/catDialogues";
import { cats as allCats } from "@/data/cats";
import type { Cat } from "@/lib/types";
import type { VoterProfile } from "@/lib/voterStorage";

type CatMemoryBookProps = {
  open: boolean;
  voter: VoterProfile | null;
  catAffection: AffectionMap;
  /** Total coupons earned across all votes. */
  totalCoupons: number;
  onClose: () => void;
  /** Open the storybook for the given cat. */
  onOpenCat: (cat: Cat) => void;
};

// Supporter tiers per the spec (separate from the per-cat affection levels —
// these reward total hearts across all cats).
const SUPPORTER_TIERS: Array<{
  threshold: number;
  label: string;
  emoji: string;
}> = [
  { threshold: 0, label: "Café Guest", emoji: "🐾" },
  { threshold: 1, label: "Cat Friend", emoji: "💕" },
  { threshold: 5, label: "Rescue Supporter", emoji: "💖" },
  { threshold: 15, label: "Siamese Guardian", emoji: "✨" },
  { threshold: 30, label: "Cat Council Member", emoji: "👑" },
  { threshold: 50, label: "Mayor Maker", emoji: "🏆" },
];

function supporterTierFor(totalHearts: number) {
  let current = SUPPORTER_TIERS[0];
  for (const tier of SUPPORTER_TIERS) {
    if (totalHearts >= tier.threshold) current = tier;
  }
  return current;
}

/**
 * Personal scrapbook. Opens as a full modal showing the user's journey:
 * stats summary at the top, a favorite-cat hero, and a grid of every cat
 * they've supported. Mobile-first — stats stack, grid scales down.
 */
export default function CatMemoryBook({
  open,
  voter,
  catAffection,
  totalCoupons,
  onClose,
  onOpenCat,
}: CatMemoryBookProps) {
  // Body scroll lock + ESC.
  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  const firstName = voter?.name.trim().split(" ")[0] || voter?.name || "Friend";

  // Sort supported cats by hearts (desc), then most recent.
  const supportedEntries = useMemo<CatAffection[]>(() => {
    return Object.values(catAffection).sort((a, b) => {
      if (b.heartsGiven !== a.heartsGiven) return b.heartsGiven - a.heartsGiven;
      return b.lastHeartedAt - a.lastHeartedAt;
    });
  }, [catAffection]);

  const totalHearts = totalHeartsAcrossCats(catAffection);
  const catsSupportedCount = supportedEntries.length;
  const favoriteCatId = favoriteCatIdFromAffection(catAffection);
  const favoriteCat = favoriteCatId
    ? allCats.find((c) => c.id === favoriteCatId)
    : null;
  const favoriteAffection = favoriteCatId
    ? catAffection[String(favoriteCatId)]
    : null;
  const supporterTier = supporterTierFor(totalHearts);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="memory-book-root"
          className="fixed inset-0 z-50 flex items-end justify-center px-2 pb-2 pt-4 sm:items-center sm:p-4 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="memory-book-title"
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

          {/* Panel */}
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            className="relative z-10 w-full max-w-[820px]"
          >
            <div
              className="relative max-h-[90vh] overflow-hidden rounded-t-[28px] bg-cream shadow-glass-inset sm:rounded-[28px]"
              style={{
                boxShadow:
                  "0 30px 90px -30px rgba(90,49,20,0.45), 0 0 0 1px rgba(90,49,20,0.06)",
              }}
            >
              {/* Brand gradient stripe */}
              <div className="h-1.5 w-full bg-gradient-to-r from-mint via-pink to-pink-dark" />

              {/* Mobile grab handle */}
              <div
                aria-hidden="true"
                className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-brown/15 sm:hidden"
              />

              {/* Paper texture overlay (matches storybook) */}
              <PaperTexture />

              {/* Faint paw watermarks */}
              <PawWatermark className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 text-pink/12" />
              <PawWatermark className="pointer-events-none absolute -right-8 bottom-16 h-28 w-28 rotate-[18deg] text-mint-dark/18" />

              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close memory book"
                className="absolute right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-brown shadow-soft transition hover:bg-white"
              >
                <X className="h-4 w-4" strokeWidth={2.4} />
              </button>

              <div className="relative z-10 max-h-[86vh] overflow-y-auto overflow-x-hidden scrollbar-none px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-7">
                {/* Header */}
                <header className="text-center">
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-pink/18 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-dark">
                    <BookOpen className="h-3 w-3" strokeWidth={2.6} />
                    Memory Book
                  </p>
                  <h2
                    id="memory-book-title"
                    className="mt-2 font-display text-[26px] font-bold leading-tight text-brown sm:text-[32px]"
                  >
                    {firstName}&apos;s Cat Memory Book
                  </h2>
                  <p className="mt-1 font-display text-sm italic text-pink-dark sm:text-base">
                    Every heart, every visit, kept here forever.
                  </p>
                </header>

                {/* Stats summary */}
                <section className="mt-5">
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <StatTile
                      label="Hearts Shared"
                      value={totalHearts.toString()}
                      icon={<Heart className="h-4 w-4" fill="currentColor" strokeWidth={0} />}
                      tint="pink"
                    />
                    <StatTile
                      label="Cats Supported"
                      value={catsSupportedCount.toString()}
                      icon={
                        <svg
                          viewBox="0 0 64 64"
                          className="h-4 w-4"
                          fill="currentColor"
                        >
                          <ellipse cx="32" cy="42" rx="14" ry="11" />
                          <ellipse cx="14" cy="26" rx="6" ry="8" />
                          <ellipse cx="50" cy="26" rx="6" ry="8" />
                          <ellipse cx="22" cy="12" rx="5" ry="7" />
                          <ellipse cx="42" cy="12" rx="5" ry="7" />
                        </svg>
                      }
                      tint="mint"
                    />
                    <StatTile
                      label="Coupons Earned"
                      value={totalCoupons.toString()}
                      icon={<Gift className="h-4 w-4" strokeWidth={2.4} />}
                      tint="cream"
                    />
                    <SupporterTile
                      label="Supporter Level"
                      tier={supporterTier}
                    />
                  </div>
                </section>

                {/* Favorite cat hero (only when we have one) */}
                {favoriteCat && favoriteAffection && (
                  <section className="mt-5">
                    <SectionHeading>Your Favorite Cat</SectionHeading>
                    <FavoriteCatHero
                      cat={favoriteCat}
                      affection={favoriteAffection}
                      voterFirstName={firstName}
                      onOpen={() => onOpenCat(favoriteCat)}
                    />
                  </section>
                )}

                {/* Supported cats grid OR empty state */}
                <section className="mt-6">
                  <SectionHeading>
                    {supportedEntries.length > 0
                      ? "Cats You've Supported"
                      : "Your Scrapbook"}
                  </SectionHeading>

                  {supportedEntries.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {supportedEntries.map((entry) => {
                        const cat = allCats.find(
                          (c) => c.id === entry.catId,
                        );
                        if (!cat) return null;
                        return (
                          <ScrapbookCard
                            key={entry.catId}
                            cat={cat}
                            entry={entry}
                            voterFirstName={firstName}
                            onClick={() => onOpenCat(cat)}
                          />
                        );
                      })}
                    </div>
                  )}
                </section>

                <p className="mt-6 text-center text-[11px] italic text-brown/55">
                  Your story is just getting started 🐾
                </p>

                <div className="h-2 sm:hidden" aria-hidden="true" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ===================== Sub-components =====================

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-px flex-1"
        style={{
          backgroundImage:
            "linear-gradient(to right, transparent, rgba(90,49,20,0.25), transparent)",
        }}
      />
      <h3 className="font-display text-[12px] font-bold uppercase tracking-[0.2em] text-brown/70">
        {children}
      </h3>
      <span
        aria-hidden="true"
        className="h-px flex-1"
        style={{
          backgroundImage:
            "linear-gradient(to right, transparent, rgba(90,49,20,0.25), transparent)",
        }}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tint: "pink" | "mint" | "cream";
}) {
  const surface =
    tint === "pink"
      ? "from-pink-light/55 via-cream to-pink-light/35 text-pink-dark"
      : tint === "mint"
        ? "from-mint-light/55 via-cream to-mint-light/35 text-mint-dark"
        : "from-cream via-white to-cream text-brown";
  return (
    <div
      className={`flex flex-col items-start gap-1 rounded-2xl border border-brown/10 bg-gradient-to-br px-3 py-2.5 shadow-sm backdrop-blur ${surface}`}
    >
      <div className="flex items-center gap-1.5">
        <span aria-hidden="true">{icon}</span>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-brown/55">
          {label}
        </span>
      </div>
      <span className="font-display text-xl font-bold leading-none text-brown sm:text-2xl">
        {value}
      </span>
    </div>
  );
}

function SupporterTile({
  label,
  tier,
}: {
  label: string;
  tier: { label: string; emoji: string };
}) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-2xl border border-brown/10 bg-gradient-to-br from-cream via-white to-pink-light/35 px-3 py-2.5 shadow-sm backdrop-blur">
      <div className="flex items-center gap-1.5">
        <Crown className="h-4 w-4 text-pink-dark" strokeWidth={2.4} />
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-brown/55">
          {label}
        </span>
      </div>
      <span className="flex items-baseline gap-1.5">
        <span aria-hidden="true" className="text-base">
          {tier.emoji}
        </span>
        <span className="font-display text-[15px] font-bold leading-tight text-brown sm:text-base">
          {tier.label}
        </span>
      </span>
    </div>
  );
}

function FavoriteCatHero({
  cat,
  affection,
  voterFirstName,
  onOpen,
}: {
  cat: Cat;
  affection: CatAffection;
  voterFirstName: string;
  onOpen: () => void;
}) {
  const meta = getAffectionLevelMeta(affection.affectionLevel);
  const quote = useMemo(
    () =>
      getCatDialogue({
        cat,
        context: "returning",
        voterFirstName,
        affectionLevel: affection.affectionLevel,
      }),
    [cat, voterFirstName, affection.affectionLevel],
  );

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-3 flex w-full items-center gap-3 rounded-3xl border border-pink-dark/15 bg-gradient-to-br from-pink-light/45 via-cream to-mint-light/40 p-3 text-left shadow-card transition hover:shadow-glow sm:gap-4 sm:p-4"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-cream bg-gradient-to-br from-mint-light via-cream to-pink-light shadow-soft sm:h-24 sm:w-24">
        <Image
          src={cat.image}
          alt={cat.name}
          fill
          sizes="96px"
          className="object-cover"
        />
        {/* Heart sticker overlay */}
        <span
          aria-hidden="true"
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink to-pink-dark shadow-card"
        >
          <Heart
            className="h-3.5 w-3.5 text-cream"
            fill="currentColor"
            strokeWidth={0}
          />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="inline-flex items-center gap-1 rounded-full bg-pink/22 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-pink-dark">
          <Sparkles className="h-2.5 w-2.5" strokeWidth={2.6} />
          Closest Bond
        </p>
        <h4 className="mt-1 font-display text-lg font-bold leading-tight text-brown sm:text-xl">
          {cat.name}
        </h4>
        <p className="text-[12px] italic text-pink-dark">{cat.title}</p>
        <p className="mt-1 text-[12px] text-brown/70 sm:text-[13px]">
          <span aria-hidden="true">{meta.emoji}</span>{" "}
          <span className="font-semibold text-brown">{meta.label}</span> ·{" "}
          {affection.heartsGiven}{" "}
          {affection.heartsGiven === 1 ? "heart" : "hearts"}
        </p>
        {quote && (
          <p className="mt-1 truncate text-[11.5px] italic text-brown/55">
            &ldquo;{quote}&rdquo;
          </p>
        )}
      </div>
    </button>
  );
}

function ScrapbookCard({
  cat,
  entry,
  voterFirstName,
  onClick,
}: {
  cat: Cat;
  entry: CatAffection;
  voterFirstName: string;
  onClick: () => void;
}) {
  const meta = getAffectionLevelMeta(entry.affectionLevel);
  const dateLabel = useMemo(
    () =>
      new Date(entry.lastHeartedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [entry.lastHeartedAt],
  );

  // Short scrapbook caption.
  const caption = useMemo(
    () =>
      getCatDialogue({
        cat,
        context: "afterHeart",
        voterFirstName,
        affectionLevel: entry.affectionLevel,
      }),
    [cat, voterFirstName, entry.affectionLevel],
  );

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3, rotate: 0.4 }}
      whileTap={{ scale: 0.98 }}
      // Note: NO overflow-hidden — the decorative tape sits above the
      // card's top edge and would otherwise be clipped in half.
      className="relative mt-3 flex w-full min-w-0 flex-col gap-2 rounded-2xl border border-brown/10 bg-white/85 p-3 text-left shadow-soft transition hover:shadow-card"
    >
      {/* Decorative tape — sits above the card border, visible in full */}
      <span
        aria-hidden="true"
        className="absolute -top-2 left-4 h-3.5 w-12 -rotate-3 rounded-sm bg-pink/45 opacity-80 shadow-sm"
      />

      <div className="flex items-start gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-brown/10 bg-gradient-to-br from-mint-light via-cream to-pink-light">
          <Image
            src={cat.image}
            alt={cat.name}
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-brown">
            {cat.name}
          </p>
          <p className="truncate text-[11px] italic text-pink-dark">
            {cat.title}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-brown/65">
            <span aria-hidden="true">{meta.emoji}</span> {meta.label}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-full bg-pink-light/40 px-2 py-0.5 font-semibold text-brown/75">
          <Heart
            className="h-2.5 w-2.5 text-pink-dark"
            fill="currentColor"
            strokeWidth={0}
          />
          {entry.heartsGiven}{" "}
          {entry.heartsGiven === 1 ? "heart" : "hearts"}
        </span>
        <span className="text-brown/55">{dateLabel}</span>
      </div>

      {caption && (
        <p className="text-[11.5px] italic leading-snug text-brown/65">
          &ldquo;{caption}&rdquo;
        </p>
      )}
    </motion.button>
  );
}

function EmptyState() {
  return (
    <div className="mt-3 flex flex-col items-center gap-2 rounded-3xl border border-brown/10 bg-white/70 px-6 py-10 text-center shadow-soft">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-light/45 text-pink-dark">
        <PawWatermark className="h-7 w-7" />
      </div>
      <h4 className="font-display text-lg font-bold text-brown">
        Your memory book is waiting for its first paw print 🐾
      </h4>
      <p className="max-w-xs text-sm text-brown/65">
        Give a heart to a cat to begin your story.
      </p>
    </div>
  );
}

// ===================== Inline decorations =====================

function PaperTexture() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-multiply"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.353 0 0 0 0 0.192 0 0 0 0 0.078 0 0 0 0.7 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
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

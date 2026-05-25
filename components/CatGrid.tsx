"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SearchX } from "lucide-react";
import CatCard, { type GiveHeartContext } from "./CatCard";
import type { Cat } from "@/lib/types";
import type { HeartedCatsMap } from "@/lib/voterStorage";
import type { AffectionMap } from "@/lib/catAffection";

type CatGridProps = {
  cats: Cat[];
  /**
   * Cats currently on the 5-hour cooldown, keyed by stringified catId. The
   * grid uses this to flag each card's "hearted" state + cooldown timer.
   */
  heartedCats?: HeartedCatsMap;
  /** Per-cat affection map — drives the "Lv X · Cat Buddy" chip. */
  catAffection?: AffectionMap;
  /** Cat currently being animated into a Give-Heart sequence (if any). */
  animatingCatId?: number | null;
  /**
   * Cats whose live rank just improved — drives the celebratory sparkle
   * burst on the climbing card.
   */
  risingCatIds?: Set<number>;
  onView: (cat: Cat) => void;
  onGiveHeart: (cat: Cat, ctx?: GiveHeartContext) => void;
  onResetFilters?: () => void;
};

export default function CatGrid({
  cats,
  heartedCats,
  catAffection,
  animatingCatId = null,
  risingCatIds,
  onView,
  onGiveHeart,
  onResetFilters,
}: CatGridProps) {
  return (
    <section
      id="candidates"
      className="relative mx-auto mt-6 max-w-7xl px-4 pb-16 sm:px-6"
      aria-label="The 16 candidates"
    >
      {cats.length === 0 ? (
        <EmptyState onReset={onResetFilters} />
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-5"
        >
          <AnimatePresence mode="popLayout">
            {cats.map((cat, i) => {
              const cooldownEntry = heartedCats?.[String(cat.id)];
              const affectionEntry = catAffection?.[String(cat.id)];
              return (
                <motion.div
                  key={cat.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25 }}
                >
                  <CatCard
                    cat={cat}
                    index={i}
                    hearted={!!cooldownEntry}
                    affectionLevel={affectionEntry?.affectionLevel ?? 0}
                    heartsGiven={affectionEntry?.heartsGiven ?? 0}
                    isAnimating={animatingCatId === cat.id}
                    isRising={!!risingCatIds?.has(cat.id)}
                    onView={onView}
                    onGiveHeart={onGiveHeart}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}

function EmptyState({ onReset }: { onReset?: () => void }) {
  return (
    <div className="card-surface mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl px-6 py-12 text-center shadow-soft">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-light/50 text-pink-dark">
        <SearchX className="h-6 w-6" strokeWidth={2.2} />
      </div>
      <h3 className="font-display text-xl font-bold text-brown">
        Oops, the cats are hiding today 🐾
      </h3>
      <p className="text-sm text-brown/65">
        Try a different name or clear the active filter to see all 16
        café candidates again.
      </p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-1 rounded-full bg-brown px-5 py-2 text-xs font-semibold text-cream transition hover:bg-brown-400"
        >
          Show all cats
        </button>
      )}
    </div>
  );
}

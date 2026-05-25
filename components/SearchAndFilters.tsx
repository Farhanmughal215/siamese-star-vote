"use client";

import { motion } from "framer-motion";
import { Search, Trophy, X } from "lucide-react";
import { FILTER_TAGS } from "@/data/cats";
import type { FilterTag } from "@/lib/types";

export type FilterValue = "All" | FilterTag;

type SearchAndFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  activeFilter: FilterValue;
  onFilterChange: (value: FilterValue) => void;
  resultsCount: number;
};

const ALL_CHIPS: FilterValue[] = ["All", ...FILTER_TAGS];

export default function SearchAndFilters({
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  resultsCount,
}: SearchAndFiltersProps) {
  return (
    <section
      className="relative mx-auto mt-6 max-w-7xl px-4 sm:px-6"
      aria-label="Search and filter cats"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Search input */}
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Search by cat name</span>
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-brown/45">
            <Search className="h-4 w-4" strokeWidth={2.4} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search a cat by name..."
            className="w-full rounded-full border border-brown/15 bg-white/80 py-3 pl-11 pr-10 text-sm text-brown shadow-sm transition placeholder:text-brown/40 focus:border-brown/40 focus:bg-white focus:outline-none focus:shadow-soft"
          />
          {search.length > 0 && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute inset-y-0 right-3 my-auto flex h-7 w-7 items-center justify-center rounded-full text-brown/50 transition hover:bg-brown/10 hover:text-brown"
            >
              <X className="h-4 w-4" strokeWidth={2.4} />
            </button>
          )}
        </label>

        {/* Results count + ranking hint chip */}
        <div className="flex items-center gap-2">
          <p className="hidden text-xs font-semibold uppercase tracking-wider text-brown/55 sm:block">
            {resultsCount} {resultsCount === 1 ? "cat" : "cats"}
          </p>
          <span
            title="Cats are ordered by total hearts received. Vote to climb the leaderboard."
            className="inline-flex items-center gap-1 rounded-full bg-pink-light/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-dark"
          >
            <Trophy className="h-3 w-3" strokeWidth={2.6} />
            Ranked by hearts
          </span>
        </div>
      </div>

      {/* Filter chips — horizontally scrollable on small screens */}
      <div
        className="scrollbar-none -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1"
        role="tablist"
        aria-label="Filter cats by personality"
      >
        {ALL_CHIPS.map((chip) => {
          const active = chip === activeFilter;
          return (
            <button
              key={chip}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onFilterChange(chip)}
              className="relative shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition"
            >
              {/* Animated active pill background */}
              {active && (
                <motion.span
                  layoutId="filter-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-brown shadow-soft"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={active ? "text-cream" : "text-brown/75"}>
                {chip}
              </span>
              {!active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 rounded-full border border-brown/15 bg-white/70 backdrop-blur"
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

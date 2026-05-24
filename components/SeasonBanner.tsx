"use client";

import { ArrowRight, BarChart3, Calendar, Clock, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CurrentSeason } from "@/lib/supabase/services/seasons";

/**
 * Slim banner that announces the current voting season and ticks down a live
 * countdown to its end. Renders nothing when `season` is null (which means
 * either Supabase isn't configured, or there's no active season — in which
 * case the BIG inline "voting closed" message handles the empty state).
 */
export default function SeasonBanner({
  season,
}: {
  season: CurrentSeason | null;
}) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!season) return;
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [season]);

  if (!season) return null;

  const endsAt = new Date(season.ends_at).getTime();
  const remainingMs = Math.max(0, endsAt - now);
  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor(
    (remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
  );

  return (
    <div className="mx-auto mt-2 max-w-7xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl border border-pink-dark/15 bg-gradient-to-r from-mint-light/40 via-cream to-pink-light/40 px-4 py-2.5 shadow-soft">
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          {/* Left side — season info */}
          <span className="inline-flex items-center gap-1 rounded-full bg-brown px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cream">
            <Trophy className="h-3 w-3" strokeWidth={2.6} />
            Live Season
          </span>
          <span className="font-display text-base font-bold text-brown">
            {season.name}
          </span>
          <span className="inline-flex items-center gap-1 text-brown/65">
            <Calendar className="h-3 w-3" strokeWidth={2.6} />
            until{" "}
            {new Date(season.ends_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-pink-light/50 px-2 py-0.5 text-[11px] font-semibold text-pink-dark">
            <Clock className="h-3 w-3" strokeWidth={2.6} />
            {remainingMs <= 0
              ? "Voting closed"
              : days > 0
                ? `${days}d ${hours}h to go`
                : `${hours}h to go`}
          </span>

          {/* Right side — View Results CTA. `ml-auto` pushes it to the end
              on wide screens; wraps naturally below on mobile. */}
          <Link
            href="/results"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brown px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cream shadow-soft transition hover:bg-brown-400 hover:shadow-card"
          >
            <BarChart3 className="h-3 w-3" strokeWidth={2.6} />
            View Results
            <ArrowRight className="h-3 w-3" strokeWidth={2.6} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Big inline panel shown when there's no active season. */
export function VotingClosedNotice() {
  return (
    <div className="mx-auto my-6 max-w-3xl px-4">
      <div className="rounded-3xl border border-brown/15 bg-cream/90 px-6 py-5 text-center shadow-soft">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-dark">
          Voting Closed
        </p>
        <h2 className="mt-1 font-display text-xl font-bold text-brown">
          No active election right now
        </h2>
        <p className="mt-1.5 text-sm text-brown/70">
          The next race is being prepared. Come back soon — the cats are
          warming up their best slow-blinks. 🐾
        </p>
      </div>
    </div>
  );
}

/**
 * Public live results page — designed to be projected on a screen in the
 * café. No auth required, auto-refreshes every 30 seconds, big typography
 * so it reads from across the room.
 */

import Link from "next/link";
import {
  Calendar,
  Clock,
  Crown,
  Heart,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/ssr/server";

export const dynamic = "force-dynamic";

// Triggers a full-page reload every 30s — perfect for a kiosk display.
const REFRESH_SECONDS = 30;

type LeaderRow = {
  catId: string;
  name: string;
  image: string | null;
  hearts: number;
};

export default async function ResultsPage() {
  const supabase = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  // Pull the active season (if any) — affects what hearts we count.
  const { data: activeSeason } = await supabase
    .from("voting_seasons")
    .select("*")
    .eq("status", "open")
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Heart counts. Filter by season when one is active so the leaderboard
  // reflects "this race" not all-time.
  let heartsQuery = supabase.from("hearts").select("cat_id");
  if (activeSeason) {
    heartsQuery = heartsQuery.eq("season_id", activeSeason.id);
  }
  const [{ data: heartRows }, { data: cats }, votersRes, recentHeartsRes] =
    await Promise.all([
      heartsQuery,
      supabase
        .from("cats")
        .select("id, name, image_url, is_active")
        .eq("is_active", true),
      supabase.from("voters").select("*", { count: "exact", head: true }),
      supabase
        .from("hearts_view")
        .select("voter_name, cat_name, hearted_at")
        .order("hearted_at", { ascending: false })
        .limit(10),
    ]);

  // Tally per-cat hearts.
  const heartsByCat = new Map<string, number>();
  for (const row of heartRows ?? []) {
    heartsByCat.set(row.cat_id, (heartsByCat.get(row.cat_id) ?? 0) + 1);
  }

  const leaderboard: LeaderRow[] = (cats ?? [])
    .map((c) => ({
      catId: c.id,
      name: c.name,
      image: c.image_url,
      hearts: heartsByCat.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.hearts - a.hearts);

  const totalHearts = leaderboard.reduce((s, r) => s + r.hearts, 0);
  const totalVoters = votersRes.count ?? 0;
  const maxHearts = leaderboard[0]?.hearts ?? 0;

  return (
    <main className="relative min-h-screen bg-cream">
      {/* Auto-refresh for kiosk mode — full reload every 30 seconds. */}
      <meta httpEquiv="refresh" content={String(REFRESH_SECONDS)} />

      {/* Soft brand wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(900px 600px at 12% -8%, rgba(187,221,211,0.32), transparent 60%), radial-gradient(800px 600px at 110% 10%, rgba(231,158,174,0.28), transparent 60%), radial-gradient(700px 500px at 50% 110%, rgba(231,158,174,0.18), transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <Hero
          season={activeSeason}
          totalHearts={totalHearts}
          totalVoters={totalVoters}
        />

        {/* Leaderboard */}
        <section className="mt-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold text-brown sm:text-3xl">
              Live Standings
            </h2>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brown/55">
              Auto-refreshes every {REFRESH_SECONDS}s
            </span>
          </div>

          {leaderboard.length === 0 || maxHearts === 0 ? (
            <EmptyState />
          ) : (
            <ol className="space-y-3">
              {leaderboard.map((row, i) => (
                <LeaderboardRow
                  key={row.catId}
                  rank={i + 1}
                  row={row}
                  maxHearts={maxHearts}
                />
              ))}
            </ol>
          )}
        </section>

        {/* Recent activity feed */}
        <section className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold text-brown sm:text-2xl">
              Latest Hearts
            </h2>
          </div>
          {(recentHeartsRes.data ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-brown/15 bg-white/40 px-4 py-6 text-center text-sm text-brown/55">
              The café is quiet right now. The next heart will appear here 🐾
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(recentHeartsRes.data ?? []).map((row, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-2xl border border-brown/10 bg-white/80 px-4 py-2.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-light/40 text-pink-dark">
                    <Heart
                      className="h-4 w-4"
                      fill="currentColor"
                      strokeWidth={0}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-brown">
                      <span className="font-semibold text-pink-dark">
                        {firstNameOnly(row.voter_name as string)}
                      </span>{" "}
                      hearted{" "}
                      <span className="font-semibold">{row.cat_name}</span>
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brown/45">
                      {timeAgo(new Date(row.hearted_at as string))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Footer / CTA */}
        <footer className="mt-10 border-t border-brown/10 pt-5 text-center">
          <p className="text-[12px] text-brown/55">
            Want to vote?{" "}
            <Link
              href="/"
              className="font-semibold text-pink-dark hover:underline"
            >
              Visit the voting page →
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}

// ---------- Sub-components ----------

function Hero({
  season,
  totalHearts,
  totalVoters,
}: {
  season:
    | {
        id: string;
        name: string;
        starts_at: string;
        ends_at: string;
        status: "open" | "closed";
      }
    | null
    | undefined;
  totalHearts: number;
  totalVoters: number;
}) {
  const endsAt = season ? new Date(season.ends_at).getTime() : null;
  const remainingMs = endsAt ? Math.max(0, endsAt - Date.now()) : 0;
  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor(
    (remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
  );

  return (
    <header className="relative overflow-hidden rounded-3xl border border-pink-dark/15 bg-gradient-to-br from-cream via-pink-light/20 to-mint-light/30 p-6 shadow-card sm:p-8">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-mint via-pink to-pink-dark" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brown px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cream">
            <Trophy className="h-3 w-3" strokeWidth={2.6} />
            {season ? "Live Race" : "All-Time Standings"}
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-brown sm:text-5xl">
            {season ? season.name : "Cat Mayor Election"}
          </h1>
          {season && (
            <p className="mt-2 inline-flex flex-wrap items-center gap-2 text-sm text-brown/70">
              <Calendar className="h-4 w-4 text-pink-dark" strokeWidth={2.6} />
              Ends{" "}
              {new Date(season.ends_at).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              <span className="inline-flex items-center gap-1 rounded-full bg-pink-light/50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-pink-dark">
                <Clock className="h-3 w-3" strokeWidth={2.6} />
                {remainingMs <= 0
                  ? "Closing now"
                  : days > 0
                    ? `${days}d ${hours}h to go`
                    : `${hours}h to go`}
              </span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <BigStat
            label={season ? "Hearts this season" : "Total hearts"}
            value={totalHearts}
            icon={
              <Heart className="h-4 w-4" fill="currentColor" strokeWidth={0} />
            }
          />
          <BigStat
            label="Voters"
            value={totalVoters}
            icon={<Users className="h-4 w-4" strokeWidth={2.4} />}
          />
        </div>
      </div>
    </header>
  );
}

function BigStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border border-brown/10 bg-white/80 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-pink-dark">
        <span aria-hidden="true">{icon}</span>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-brown/55">
          {label}
        </span>
      </div>
      <span className="font-display text-3xl font-bold leading-none text-brown sm:text-4xl">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function LeaderboardRow({
  rank,
  row,
  maxHearts,
}: {
  rank: number;
  row: LeaderRow;
  maxHearts: number;
}) {
  const pct = maxHearts > 0 ? (row.hearts / maxHearts) * 100 : 0;
  const isLeader = rank === 1 && row.hearts > 0;
  const isPodium = rank <= 3 && row.hearts > 0;

  return (
    <li
      className={`group relative overflow-hidden rounded-3xl border bg-white/80 p-4 shadow-sm transition sm:p-5 ${
        isLeader
          ? "border-pink-dark/30 ring-2 ring-pink-dark/15"
          : isPodium
            ? "border-pink-light/60"
            : "border-brown/10"
      }`}
    >
      {/* Background bar */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 -z-0 bg-gradient-to-r from-pink-light/35 via-pink-light/20 to-transparent transition-all"
        style={{ width: `${pct}%` }}
      />

      <div className="relative z-10 flex items-center gap-3 sm:gap-4">
        {/* Rank */}
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-display text-xl font-bold sm:h-14 sm:w-14 sm:text-2xl ${
            isLeader
              ? "bg-gradient-to-br from-pink to-pink-dark text-cream shadow-card"
              : isPodium
                ? "bg-pink-light/50 text-pink-dark"
                : "bg-brown/8 text-brown/65"
          }`}
        >
          {isLeader ? (
            <Crown className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.4} />
          ) : (
            <span>#{rank}</span>
          )}
        </div>

        {/* Cat photo */}
        {row.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.image}
            alt={row.name}
            className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-brown/10 sm:h-14 sm:w-14"
          />
        )}

        {/* Name + leader badge */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-bold text-brown sm:text-2xl">
              {row.name}
            </h3>
            {isLeader && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brown px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream">
                <Sparkles className="h-3 w-3" strokeWidth={2.6} />
                Currently Leading
              </span>
            )}
          </div>
        </div>

        {/* Heart count */}
        <div className="shrink-0 text-right">
          <p className="font-display text-3xl font-bold leading-none text-brown sm:text-4xl">
            {row.hearts.toLocaleString()}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-pink-dark">
            {row.hearts === 1 ? "heart" : "hearts"}
          </p>
        </div>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-brown/20 bg-white/40 px-6 py-12 text-center">
      <Heart
        className="mx-auto h-10 w-10 text-pink-dark/45"
        fill="currentColor"
        strokeWidth={0}
      />
      <p className="mt-3 font-display text-xl font-bold text-brown/65">
        No hearts yet
      </p>
      <p className="text-sm text-brown/55">
        The race begins with the first heart. 🐾
      </p>
    </div>
  );
}

// ---------- Helpers ----------

function firstNameOnly(full: string): string {
  if (!full) return "Someone";
  return full.trim().split(/\s+/)[0];
}

function timeAgo(date: Date): string {
  const diff = Math.max(0, Date.now() - date.getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

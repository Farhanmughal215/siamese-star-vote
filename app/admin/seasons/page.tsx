import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Lock,
  Plus,
  Trash2,
  Trophy,
  Unlock,
} from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/ssr/server";
import {
  closeSeason,
  createSeason,
  deleteSeason,
  reopenSeason,
  updateSeason,
} from "../actions";

export const dynamic = "force-dynamic";

type Season = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  status: "open" | "closed";
  winner_cat_id: string | null;
  created_at: string;
};

export default async function AdminSeasonsPage() {
  const supabase = createServiceRoleClient();
  const { data: seasons } = await supabase
    .from("voting_seasons")
    .select("*")
    .order("starts_at", { ascending: false });

  const list = (seasons ?? []) as Season[];
  const now = Date.now();

  // Pull cat names for winner labels.
  const winnerIds = list.map((s) => s.winner_cat_id).filter(Boolean) as string[];
  const { data: winnerCats } = winnerIds.length
    ? await supabase.from("cats").select("id, name").in("id", winnerIds)
    : { data: [] as { id: string; name: string }[] };
  const catNameById = new Map(
    (winnerCats ?? []).map((c) => [c.id, c.name] as const),
  );

  // Per-season heart count (so the admin sees engagement at a glance).
  const seasonIds = list.map((s) => s.id);
  const { data: heartRows } = seasonIds.length
    ? await supabase
        .from("hearts")
        .select("season_id")
        .in("season_id", seasonIds)
    : { data: [] as { season_id: string | null }[] };
  const heartsBySeason = new Map<string, number>();
  for (const r of heartRows ?? []) {
    if (!r.season_id) continue;
    heartsBySeason.set(
      r.season_id,
      (heartsBySeason.get(r.season_id) ?? 0) + 1,
    );
  }

  const liveCount = list.filter(
    (s) =>
      s.status === "open" &&
      new Date(s.starts_at).getTime() <= now &&
      new Date(s.ends_at).getTime() >= now,
  ).length;

  // Convert ISO → "YYYY-MM-DDTHH:mm" for the datetime-local input default.
  function toLocalInput(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // Default next-month season for the "create" form.
  const defaultStart = new Date();
  const defaultEnd = new Date();
  defaultEnd.setMonth(defaultEnd.getMonth() + 1);

  return (
    <div>
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brown/55">
          Mayor of the Month
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-brown">
          Voting Seasons
        </h1>
        <p className="mt-1 text-sm text-brown/65">
          Define a start + end date for each race. When no season is live,
          the public site shows a &ldquo;Voting Closed&rdquo; banner.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 ${
              liveCount > 0
                ? "bg-mint-light/50 text-mint-dark"
                : "bg-brown/10 text-brown/55"
            }`}
          >
            <Trophy className="h-3 w-3" strokeWidth={2.6} />
            {liveCount > 0 ? "Live now" : "No active season"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-pink-light/40 px-2.5 py-0.5 text-pink-dark">
            <CalendarDays className="h-3 w-3" strokeWidth={2.6} />
            {list.length} total
          </span>
        </div>
      </header>

      {/* Create new season */}
      <details className="group mb-5 rounded-2xl border border-brown/10 bg-white/80 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-brown">
            <Plus className="h-4 w-4 text-pink-dark" strokeWidth={2.6} />
            Start a new season
          </span>
          <span className="text-[11px] text-brown/55 group-open:hidden">
            Click to expand
          </span>
        </summary>
        <form action={createSeason} className="border-t border-brown/8 p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <DTField
              name="name"
              label="Season name *"
              placeholder="e.g. Mayor of June 2026"
              required
              type="text"
            />
            <DTField
              name="starts_at"
              label="Starts at *"
              type="datetime-local"
              required
              defaultValue={toLocalInput(defaultStart.toISOString())}
            />
            <DTField
              name="ends_at"
              label="Ends at *"
              type="datetime-local"
              required
              defaultValue={toLocalInput(defaultEnd.toISOString())}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-brown px-4 py-1.5 text-xs font-semibold text-cream shadow-soft transition hover:bg-brown-400"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
              Create season
            </button>
          </div>
        </form>
      </details>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brown/20 bg-white/40 px-4 py-10 text-center">
          <CalendarDays
            className="mx-auto h-8 w-8 text-brown/35"
            strokeWidth={1.8}
          />
          <p className="mt-2 font-display text-base font-semibold text-brown/65">
            No seasons yet
          </p>
          <p className="text-[12px] text-brown/55">
            Expand &ldquo;Start a new season&rdquo; above to open the first
            race.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((s) => {
            const startsAt = new Date(s.starts_at).getTime();
            const endsAt = new Date(s.ends_at).getTime();
            const isLive =
              s.status === "open" && startsAt <= now && endsAt >= now;
            const isExpired = s.status === "open" && endsAt < now;
            const isUpcoming = s.status === "open" && startsAt > now;
            const hearts = heartsBySeason.get(s.id) ?? 0;
            const winnerName = s.winner_cat_id
              ? catNameById.get(s.winner_cat_id) ?? null
              : null;

            return (
              <div
                key={s.id}
                className={`rounded-2xl border bg-white/80 p-4 shadow-sm ${
                  isLive
                    ? "border-mint-dark/30"
                    : isExpired
                      ? "border-pink-dark/30"
                      : "border-brown/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-bold text-brown">
                        {s.name}
                      </h2>
                      <StatusBadge
                        status={s.status}
                        isLive={isLive}
                        isExpired={isExpired}
                        isUpcoming={isUpcoming}
                      />
                    </div>
                    <p className="mt-0.5 text-[12px] text-brown/65">
                      <Clock className="mr-1 inline h-3 w-3 -translate-y-px" />
                      {formatRange(s.starts_at, s.ends_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-2xl font-bold text-brown">
                      {hearts}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brown/55">
                      {hearts === 1 ? "heart" : "hearts"} this season
                    </p>
                  </div>
                </div>

                {winnerName && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-mint-light/50 to-pink-light/40 px-3 py-1 text-[12px] font-semibold text-brown">
                    <Trophy className="h-3.5 w-3.5 text-pink-dark" strokeWidth={2.6} />
                    Winner: <span className="text-pink-dark">{winnerName}</span>
                  </div>
                )}

                {/* Edit form */}
                <form
                  action={updateSeason}
                  className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
                >
                  <input type="hidden" name="id" value={s.id} />
                  <DTField
                    name="name"
                    label="Season name"
                    type="text"
                    defaultValue={s.name}
                  />
                  <DTField
                    name="starts_at"
                    label="Starts at"
                    type="datetime-local"
                    defaultValue={toLocalInput(s.starts_at)}
                  />
                  <DTField
                    name="ends_at"
                    label="Ends at"
                    type="datetime-local"
                    defaultValue={toLocalInput(s.ends_at)}
                  />
                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-full bg-brown px-4 py-1.5 text-xs font-semibold text-cream shadow-soft transition hover:bg-brown-400"
                    >
                      Save dates
                    </button>
                  </div>
                </form>

                {/* Lifecycle controls */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-brown/8 pt-3">
                  {s.status === "open" ? (
                    <form
                      action={async () => {
                        "use server";
                        await closeSeason(s.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-full border border-brown/15 bg-brown px-3 py-1.5 text-xs font-semibold text-cream shadow-soft transition hover:bg-brown-400"
                      >
                        <Lock className="h-3.5 w-3.5" strokeWidth={2.4} />
                        Close season & declare winner
                      </button>
                    </form>
                  ) : (
                    <form
                      action={async () => {
                        "use server";
                        await reopenSeason(s.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-full border border-mint-dark/30 bg-mint-light/40 px-3 py-1.5 text-xs font-semibold text-mint-dark transition hover:bg-mint-light/60"
                      >
                        <Unlock className="h-3.5 w-3.5" strokeWidth={2.4} />
                        Reopen season
                      </button>
                    </form>
                  )}

                  <form
                    action={async () => {
                      "use server";
                      await deleteSeason(s.id);
                    }}
                    className="ml-auto"
                  >
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-full border border-pink-dark/30 bg-pink-light/30 px-3 py-1.5 text-xs font-semibold text-pink-dark transition hover:bg-pink-light/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.4} />
                      Delete season
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  isLive,
  isExpired,
  isUpcoming,
}: {
  status: "open" | "closed";
  isLive: boolean;
  isExpired: boolean;
  isUpcoming: boolean;
}) {
  if (status === "closed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brown/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brown/55">
        <CheckCircle2 className="h-3 w-3" strokeWidth={2.6} />
        Archived
      </span>
    );
  }
  if (isLive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-mint-dark/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mint-dark">
        <Trophy className="h-3 w-3" strokeWidth={2.6} />
        Live
      </span>
    );
  }
  if (isUpcoming) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-pink-light/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-dark">
        <Clock className="h-3 w-3" strokeWidth={2.6} />
        Upcoming
      </span>
    );
  }
  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-pink-dark/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-dark">
        <Lock className="h-3 w-3" strokeWidth={2.6} />
        Past end · close to archive
      </span>
    );
  }
  return null;
}

function formatRange(startIso: string, endIso: string) {
  const fmt = (d: Date) =>
    d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${fmt(new Date(startIso))} → ${fmt(new Date(endIso))}`;
}

function DTField({
  name,
  label,
  type = "text",
  defaultValue,
  placeholder,
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-brown/55">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-brown/15 bg-white px-3 py-1.5 text-[13px] text-brown focus:border-brown/40 focus:outline-none"
      />
    </label>
  );
}

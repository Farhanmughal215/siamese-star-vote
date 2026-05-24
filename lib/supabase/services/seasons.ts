/**
 * Voting Seasons service — reads which (if any) season is currently open
 * for voting. Used by the public site to gate the heart button.
 *
 * "Currently open" means: status='open' AND now() is between starts_at and
 * ends_at. A season past its end date is treated as effectively closed even
 * if the admin hasn't manually clicked "Close season" yet.
 *
 * Important UX rule: if NO seasons are configured at all, we treat voting
 * as open (legacy / first-run behaviour). The "voting closed" banner only
 * appears once the admin has actually defined a season that is now past
 * its end date or marked closed.
 */

import { getSupabaseClient } from "../client";
import type { VotingSeasonRow } from "../database.types";

export type SeasonStatus = "live" | "closed" | "unconfigured";

export type CurrentSeason = VotingSeasonRow & {
  /** Convenience derived field — true when ends_at is still in the future. */
  isLive: boolean;
};

export type SeasonState = {
  status: SeasonStatus;
  /** Populated when status='live'; null otherwise. */
  current: CurrentSeason | null;
};

export async function getSeasonState(): Promise<SeasonState> {
  const client = getSupabaseClient();
  // Supabase not configured — fall back to open voting.
  if (!client) return { status: "unconfigured", current: null };

  const nowIso = new Date().toISOString();

  // Try to find an actively-running season first.
  const liveRes = await client
    .from("voting_seasons")
    .select("*")
    .eq("status", "open")
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (liveRes.data) {
    const row = liveRes.data;
    return {
      status: "live",
      current: {
        ...row,
        isLive: new Date(row.ends_at).getTime() > Date.now(),
      },
    };
  }

  // No live season — has the admin ever configured one?
  const anyRes = await client
    .from("voting_seasons")
    .select("id", { head: true, count: "exact" });

  const anyExists = (anyRes.count ?? 0) > 0;
  return {
    status: anyExists ? "closed" : "unconfigured",
    current: null,
  };
}

// ---------------------------------------------------------------------------
// Backwards-compatible thin wrapper — older callers can keep using the
// "give me the current season or null" shape.
// ---------------------------------------------------------------------------

export async function getCurrentSeason(): Promise<CurrentSeason | null> {
  const state = await getSeasonState();
  return state.current;
}

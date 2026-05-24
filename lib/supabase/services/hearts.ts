/**
 * Hearts service — per-cat 5-hour cooldown + permanent heart history.
 *
 * The `hearts` table is the source of truth for both:
 *   - Active cooldowns (rows where next_available_at > now())
 *   - Permanent vote history (all rows, including past ones)
 *
 * Note: this Phase 3B layer enforces the cooldown OPTIMISTICALLY on the
 * client. A future phase should move the check into a Postgres function
 * with a unique-while-active constraint, so a malicious client can't
 * insert two active hearts for the same cat by racing the check.
 */

import { CAT_COOLDOWN_MS } from "@/lib/voterStorage";
import { getSupabaseClient } from "../client";
import type { HeartRow } from "../database.types";

// ---------------------------------------------------------------------------
// Read paths
// ---------------------------------------------------------------------------

/**
 * Returns the currently active cooldown rows for a voter — one per cat
 * that's still locked. Used on mount to hydrate `heartedCats` state.
 *
 * Returns null when Supabase is unavailable so the caller falls back to
 * the localStorage `heartedCats` map.
 */
export async function getActiveCooldownsForVoter(
  voterId: string,
): Promise<HeartRow[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const nowIso = new Date().toISOString();
  const { data, error } = await client
    .from("hearts")
    .select("*")
    .eq("voter_id", voterId)
    .gt("next_available_at", nowIso)
    .order("hearted_at", { ascending: false });

  if (error) {
    console.warn("[hearts] getActiveCooldowns failed:", error.message);
    return null;
  }
  return data ?? [];
}

/**
 * Check whether the user can heart this cat right now — i.e., no active
 * cooldown row exists for (voter_id, cat_id). Returns:
 *   - true  → allowed (no Supabase OR no active row)
 *   - false → blocked (active cooldown row exists)
 *
 * On error, fail-open (return true) so a broken backend doesn't lock the
 * user out of every cat.
 */
export async function canHeartCat(
  voterId: string,
  catUuid: string,
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return true;

  const nowIso = new Date().toISOString();
  const { count, error } = await client
    .from("hearts")
    .select("*", { count: "exact", head: true })
    .eq("voter_id", voterId)
    .eq("cat_id", catUuid)
    .gt("next_available_at", nowIso);

  if (error) {
    console.warn("[hearts] canHeartCat failed:", error.message);
    return true;
  }
  return (count ?? 0) === 0;
}

// ---------------------------------------------------------------------------
// Write paths
// ---------------------------------------------------------------------------

export type SaveHeartArgs = {
  voterId: string;
  catUuid: string;
  deviceId: string;
  /** Cooldown length in ms; defaults to the canonical 5-hour value. */
  cooldownMs?: number;
  /** Optional season tag. When provided, the heart is linked to that season. */
  seasonId?: string | null;
};

/**
 * Insert a new heart row + return the inserted id. Caller passes the id
 * to `saveWheelSpin` (and to the affection updater) so the cascade works.
 */
export async function saveHeart(
  args: SaveHeartArgs,
): Promise<HeartRow | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const now = Date.now();
  const cooldown = args.cooldownMs ?? CAT_COOLDOWN_MS;
  const heartedAt = new Date(now).toISOString();
  const nextAvailableAt = new Date(now + cooldown).toISOString();

  const { data, error } = await client
    .from("hearts")
    .insert({
      voter_id: args.voterId,
      cat_id: args.catUuid,
      device_id: args.deviceId,
      hearted_at: heartedAt,
      next_available_at: nextAvailableAt,
      season_id: args.seasonId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.warn("[hearts] saveHeart failed:", error.message);
    return null;
  }
  return data;
}

/**
 * Undo path — delete the heart row for the 15-minute window. Cascading
 * FK deletes wipe the wheel_spin and coupon at the DB level, so no
 * separate calls are needed.
 *
 * Returns true on success, false otherwise.
 */
export async function deleteHeart(heartId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from("hearts").delete().eq("id", heartId);
  if (error) {
    console.warn("[hearts] deleteHeart failed:", error.message);
    return false;
  }
  return true;
}

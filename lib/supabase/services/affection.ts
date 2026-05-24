/**
 * Cat affection service — per-voter, per-cat heart counter + level.
 *
 * Mirrors lib/catAffection.ts' localStorage logic to the DB. Both layers
 * use the same threshold table (1/3/7/15/30 → levels 1..5) so the
 * displayed level is identical whether we read from Supabase or local.
 */

import { levelForHearts } from "@/lib/catAffection";
import { getSupabaseClient } from "../client";
import type { CatAffectionRow } from "../database.types";

// ---------------------------------------------------------------------------
// Read paths
// ---------------------------------------------------------------------------

/**
 * Fetch every cat_affection row for a voter. Used on mount to hydrate the
 * `catAffection` React state and on Memory Book open.
 *
 * Returns null when Supabase is unavailable — caller stays on localStorage.
 */
export async function getAffectionForVoter(
  voterId: string,
): Promise<CatAffectionRow[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("cat_affection")
    .select("*")
    .eq("voter_id", voterId);

  if (error) {
    console.warn("[affection] getAffectionForVoter failed:", error.message);
    return null;
  }
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Write paths
// ---------------------------------------------------------------------------

/**
 * Increment heartsGiven for a (voter, cat) pair by 1 and re-derive the
 * affection level. Returns the new row, or null on failure.
 *
 * NOTE: read-then-write — not atomic. For two near-simultaneous hearts on
 * the same cat (which the cooldown rule should prevent anyway), the final
 * count could drift by 1. Acceptable for Phase 3B; a future phase moves
 * this into a Postgres function with an UPSERT + RETURNING and an atomic
 * increment expression.
 */
export async function updateCatAffection(
  voterId: string,
  catUuid: string,
): Promise<CatAffectionRow | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  // 1. Read current row (or assume zero).
  const { data: existing, error: readError } = await client
    .from("cat_affection")
    .select("*")
    .eq("voter_id", voterId)
    .eq("cat_id", catUuid)
    .maybeSingle();

  if (readError) {
    console.warn(
      "[affection] updateCatAffection read failed:",
      readError.message,
    );
    return null;
  }

  const newHeartsGiven = (existing?.hearts_given ?? 0) + 1;
  const newLevel = levelForHearts(newHeartsGiven);
  const lastHeartedAt = new Date().toISOString();

  // 2. Upsert with the new totals.
  const { data, error } = await client
    .from("cat_affection")
    .upsert(
      {
        voter_id: voterId,
        cat_id: catUuid,
        hearts_given: newHeartsGiven,
        affection_level: newLevel,
        last_hearted_at: lastHeartedAt,
      },
      { onConflict: "voter_id,cat_id" },
    )
    .select("*")
    .single();

  if (error) {
    console.warn("[affection] updateCatAffection write failed:", error.message);
    return null;
  }
  return data;
}

/**
 * Roll back one heart from the (voter, cat) row — used by the 15-minute
 * undo. Deletes the row when the count drops to zero so the cat returns
 * to "no relationship" cleanly.
 */
export async function decrementCatAffection(
  voterId: string,
  catUuid: string,
): Promise<CatAffectionRow | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data: existing, error: readError } = await client
    .from("cat_affection")
    .select("*")
    .eq("voter_id", voterId)
    .eq("cat_id", catUuid)
    .maybeSingle();

  if (readError || !existing) return null;

  const nextHearts = existing.hearts_given - 1;
  if (nextHearts <= 0) {
    // Drop the row entirely so the UI returns to its stranger-tier baseline.
    const { error: deleteError } = await client
      .from("cat_affection")
      .delete()
      .eq("voter_id", voterId)
      .eq("cat_id", catUuid);
    if (deleteError) {
      console.warn(
        "[affection] decrement delete failed:",
        deleteError.message,
      );
    }
    return null;
  }

  const nextLevel = levelForHearts(nextHearts);
  const { data, error } = await client
    .from("cat_affection")
    .update({
      hearts_given: nextHearts,
      affection_level: nextLevel,
    })
    .eq("voter_id", voterId)
    .eq("cat_id", catUuid)
    .select("*")
    .single();

  if (error) {
    console.warn(
      "[affection] decrementCatAffection update failed:",
      error.message,
    );
    return null;
  }
  return data;
}

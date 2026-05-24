/**
 * Wheel spin service — one spin per heart, enforced by a unique constraint
 * on hearts_spins.heart_id at the DB level.
 */

import { getSupabaseClient } from "../client";
import type { WheelSpinRow } from "../database.types";

/**
 * True when a wheel_spin row already exists for this heart. Used to gate
 * the "Spin Paw Fortune" button so we don't accept duplicate spins.
 *
 * Falls back to false (i.e., assumes no spin) when Supabase is offline —
 * the local `hasSpunForVote(voteId)` in voterStorage is the authoritative
 * source in that case.
 */
export async function hasSpunForHeart(heartId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { count, error } = await client
    .from("wheel_spins")
    .select("*", { count: "exact", head: true })
    .eq("heart_id", heartId);

  if (error) {
    console.warn("[wheelSpins] hasSpunForHeart failed:", error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

export type SaveWheelSpinArgs = {
  voterId: string;
  catUuid: string;
  heartId: string;
  resultType: "win" | "lose";
  rewardTitle: string;
  /** Set when this spin produced a coupon; null/undefined otherwise. */
  couponId?: string | null;
};

/**
 * Persist a wheel spin result. Returns the inserted row's id on success.
 *
 * Race protection: the `unique (heart_id)` constraint on wheel_spins
 * guarantees that a duplicate insert errors with code 23505. We translate
 * that into a null return so the caller can recover.
 */
export async function saveWheelSpin(
  args: SaveWheelSpinArgs,
): Promise<WheelSpinRow | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("wheel_spins")
    .insert({
      voter_id: args.voterId,
      cat_id: args.catUuid,
      heart_id: args.heartId,
      result_type: args.resultType,
      reward_title: args.rewardTitle,
      coupon_id: args.couponId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    // 23505 = unique_violation. Means a spin row already exists for this
    // heart; treat as a successful no-op.
    if (error.code === "23505") {
      console.info("[wheelSpins] duplicate spin ignored");
      return null;
    }
    console.warn("[wheelSpins] saveWheelSpin failed:", error.message);
    return null;
  }
  return data;
}

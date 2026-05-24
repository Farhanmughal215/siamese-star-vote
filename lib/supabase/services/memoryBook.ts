/**
 * Memory Book aggregator — one round-trip that returns everything the
 * Memory Book modal needs:
 *
 *   - the voter's complete cat_affection list
 *   - the voter's coupon history (count + most-recent)
 *
 * Issued in parallel via Promise.all. Returns null when Supabase is
 * unavailable; the UI then renders the localStorage-derived memory book
 * (which it already does today).
 */

import { getSupabaseClient } from "../client";
import type { CatAffectionRow, CouponRow } from "../database.types";

export type MemoryBookData = {
  affection: CatAffectionRow[];
  coupons: CouponRow[];
};

export async function getMemoryBookData(
  voterId: string,
): Promise<MemoryBookData | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const [affectionResult, couponsResult] = await Promise.all([
    client.from("cat_affection").select("*").eq("voter_id", voterId),
    client
      .from("coupons")
      .select("*")
      .eq("voter_id", voterId)
      .order("issued_at", { ascending: false }),
  ]);

  if (affectionResult.error) {
    console.warn(
      "[memoryBook] affection fetch failed:",
      affectionResult.error.message,
    );
    return null;
  }
  if (couponsResult.error) {
    console.warn(
      "[memoryBook] coupons fetch failed:",
      couponsResult.error.message,
    );
    return null;
  }

  return {
    affection: affectionResult.data ?? [],
    coupons: couponsResult.data ?? [],
  };
}

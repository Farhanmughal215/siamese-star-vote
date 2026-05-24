/**
 * Coupons service — café reward issuance + read for Memory Book.
 *
 * Status lifecycle:
 *   active → redeemed   (manual or admin-driven, not yet wired in Phase 3B)
 *   active → expired    (background job — not yet wired in Phase 3B)
 *
 * The 7-day expiry comes from app_settings.coupon_expiry_days; for now we
 * hard-code 7 days in `DEFAULT_COUPON_EXPIRY_MS` so the service can stand
 * alone without a settings round-trip.
 */

import { getSupabaseClient } from "../client";
import type { CouponRow } from "../database.types";

/** Default validity window. Override per-call if app_settings differs. */
export const DEFAULT_COUPON_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export type CreateCouponArgs = {
  voterId: string;
  catUuid: string;
  couponCode: string;
  rewardTitle: string;
  /** Override the default 7-day expiry if needed. */
  expiresAt?: Date;
};

/**
 * Insert a new coupon row. Returns the inserted row on success. The
 * coupon_code is supplied by the caller — already validated for uniqueness
 * via Math.random + a brand prefix (MEOW-#### / STAR-####). If the rare
 * collision happens, Supabase returns a 23505 error and we surface it as
 * a null return; the caller's localStorage path still issues the coupon.
 */
export async function createCoupon(
  args: CreateCouponArgs,
): Promise<CouponRow | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const expiresAt =
    args.expiresAt ?? new Date(Date.now() + DEFAULT_COUPON_EXPIRY_MS);

  const { data, error } = await client
    .from("coupons")
    .insert({
      voter_id: args.voterId,
      cat_id: args.catUuid,
      coupon_code: args.couponCode,
      reward_title: args.rewardTitle,
      expires_at: expiresAt.toISOString(),
      status: "active",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      console.warn("[coupons] coupon_code collision — caller should retry");
      return null;
    }
    console.warn("[coupons] createCoupon failed:", error.message);
    return null;
  }
  return data;
}

/**
 * Fetch every coupon a voter has earned. Used by the Memory Book stat tile
 * and (eventually) a "My Coupons" view.
 */
export async function getCouponsForVoter(
  voterId: string,
): Promise<CouponRow[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("coupons")
    .select("*")
    .eq("voter_id", voterId)
    .order("issued_at", { ascending: false });

  if (error) {
    console.warn("[coupons] getCouponsForVoter failed:", error.message);
    return null;
  }
  return data ?? [];
}

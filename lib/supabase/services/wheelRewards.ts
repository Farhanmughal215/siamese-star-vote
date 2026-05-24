/**
 * Wheel Rewards service — loads the live, admin-managed reward list +
 * the current win probability from app_settings.
 *
 * The page falls back to the static defaults in data/rewards.ts when
 * Supabase is unreachable or returns nothing.
 */

import { getSupabaseClient } from "../client";
import type { WheelRewardRow } from "../database.types";

export type WheelConfig = {
  rewards: WheelRewardRow[];
  winRatePercent: number;
};

export async function getWheelConfig(): Promise<WheelConfig | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const [rewardsRes, settingRes] = await Promise.all([
    client
      .from("wheel_rewards")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    client
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "wheel_win_rate")
      .maybeSingle(),
  ]);

  if (rewardsRes.error || !rewardsRes.data || rewardsRes.data.length === 0) {
    return null;
  }

  const parsed = Number(settingRes.data?.setting_value);
  const winRatePercent =
    Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : 20;

  return { rewards: rewardsRes.data, winRatePercent };
}

"use server";

/**
 * Server actions for admin-only mutations. Every action verifies the
 * caller is signed in AND has is_admin=true before performing any write.
 * This is defence-in-depth: the middleware already redirects non-admins,
 * but if someone manages to call these directly we still refuse.
 */

import { revalidatePath } from "next/cache";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase/ssr/server";

async function assertAdmin() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: voter } = await supabase
    .from("voters")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!voter?.is_admin) throw new Error("Not an admin");
  // Return the service-role client so the action can write across tables
  // without being blocked by per-voter RLS policies.
  return createServiceRoleClient();
}

// ---------- Coupons ----------

export async function markCouponRedeemed(couponId: string) {
  const supabase = await assertAdmin();
  await supabase
    .from("coupons")
    .update({
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
    })
    .eq("id", couponId);
  revalidatePath("/admin/coupons");
  revalidatePath("/admin");
}

/**
 * Staff-friendly: look up a coupon by its short code and mark it redeemed
 * in one shot. Used by the Quick Redeem widget on the Overview.
 */
export async function redeemCouponByCode(
  rawCode: string,
): Promise<{
  ok: boolean;
  error?: string;
  reward?: string;
  voter?: string;
  cat?: string;
}> {
  const supabase = await assertAdmin();
  const code = rawCode.trim().toUpperCase();
  if (code.length < 3) {
    return { ok: false, error: "Enter a coupon code." };
  }

  const { data: coupon } = await supabase
    .from("coupons_view")
    .select("id, status, reward_title, voter_name, cat_name, expires_at")
    .eq("coupon_code", code)
    .maybeSingle();

  if (!coupon) return { ok: false, error: `No coupon found for "${code}".` };
  if (coupon.status === "redeemed") {
    return {
      ok: false,
      error: `Already redeemed (${coupon.voter_name} · ${coupon.reward_title}).`,
    };
  }
  if (coupon.status === "expired") {
    return { ok: false, error: "This coupon has expired." };
  }
  if (new Date(coupon.expires_at).getTime() < Date.now()) {
    await supabase
      .from("coupons")
      .update({ status: "expired" })
      .eq("id", coupon.id);
    return { ok: false, error: "This coupon has expired." };
  }

  const { error } = await supabase
    .from("coupons")
    .update({
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
    })
    .eq("id", coupon.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/coupons");
  revalidatePath("/admin");
  return {
    ok: true,
    reward: coupon.reward_title,
    voter: coupon.voter_name,
    cat: coupon.cat_name,
  };
}

export async function markCouponExpired(couponId: string) {
  const supabase = await assertAdmin();
  await supabase
    .from("coupons")
    .update({ status: "expired" })
    .eq("id", couponId);
  revalidatePath("/admin/coupons");
}

export async function deleteCoupon(couponId: string) {
  const supabase = await assertAdmin();
  // Unlink the wheel_spin first so we don't violate the FK.
  await supabase
    .from("wheel_spins")
    .update({ coupon_id: null })
    .eq("coupon_id", couponId);
  await supabase.from("coupons").delete().eq("id", couponId);
  revalidatePath("/admin/coupons");
  revalidatePath("/admin");
}

// ---------- Cats ----------

export type CatEdit = {
  id: string;
  name: string;
  title: string;
  personality: string;
  description: string;
  image_url: string;
  story_url: string | null;
  is_active: boolean;
};

export async function updateCat(input: CatEdit) {
  const supabase = await assertAdmin();
  await supabase
    .from("cats")
    .update({
      name: input.name,
      title: input.title,
      personality: input.personality,
      description: input.description,
      image_url: input.image_url,
      story_url: input.story_url,
      is_active: input.is_active,
    })
    .eq("id", input.id);
  revalidatePath("/admin/cats");
  revalidatePath("/admin");
  // The home page (cats grid + dialogues + filters) reads the live cats
  // list from Supabase on mount, so invalidate it too.
  revalidatePath("/", "layout");
}

export async function createCat(formData: FormData) {
  const supabase = await assertAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim().toLowerCase();
  const title = String(formData.get("title") ?? "").trim();
  const personality = String(formData.get("personality") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const image_url = String(formData.get("image_url") ?? "").trim();
  if (name.length < 1 || image_url.length < 1) return;

  const slug =
    slugRaw.length > 0
      ? slugRaw.replace(/[^a-z0-9-]/g, "-")
      : name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

  await supabase.from("cats").insert({
    slug,
    name,
    title: title || "Café Cat",
    personality: personality || "Sweet & curious",
    description: description || "A new resident of Siamese Cat Café.",
    image_url,
    story_url: null,
    is_active: true,
  });
  revalidatePath("/admin/cats");
  revalidatePath("/admin");
  // The home page (cats grid + dialogues + filters) reads the live cats
  // list from Supabase on mount, so invalidate it too.
  revalidatePath("/", "layout");
}

export async function setCatActive(catId: string, isActive: boolean) {
  const supabase = await assertAdmin();
  await supabase
    .from("cats")
    .update({ is_active: isActive })
    .eq("id", catId);
  revalidatePath("/admin/cats");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

export async function deleteCat(catId: string) {
  const supabase = await assertAdmin();
  // Cascade clean-up: kill anything that references the cat.
  await supabase.from("hearts").delete().eq("cat_id", catId);
  await supabase.from("cat_affection").delete().eq("cat_id", catId);
  await supabase.from("wheel_spins").delete().eq("cat_id", catId);
  await supabase.from("coupons").delete().eq("cat_id", catId);
  await supabase.from("cats").delete().eq("id", catId);
  revalidatePath("/admin/cats");
  revalidatePath("/admin");
  // The home page (cats grid + dialogues + filters) reads the live cats
  // list from Supabase on mount, so invalidate it too.
  revalidatePath("/", "layout");
}

// ---------- Invitation codes ----------

export async function addInvitationCode(formData: FormData) {
  const supabase = await assertAdmin();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  const label = String(formData.get("label") ?? "").trim() || null;
  if (code.length < 3) return;
  await supabase.from("invitation_codes").upsert(
    {
      code,
      label,
      is_active: true,
    },
    { onConflict: "code" },
  );
  revalidatePath("/admin/codes");
}

export async function toggleInvitationCode(id: string, isActive: boolean) {
  const supabase = await assertAdmin();
  await supabase
    .from("invitation_codes")
    .update({ is_active: isActive })
    .eq("id", id);
  revalidatePath("/admin/codes");
}

export async function deleteInvitationCode(id: string) {
  const supabase = await assertAdmin();
  await supabase.from("invitation_codes").delete().eq("id", id);
  revalidatePath("/admin/codes");
}

// ---------- Voters ----------

export async function setVoterAdmin(voterId: string, isAdmin: boolean) {
  const supabase = await assertAdmin();
  await supabase
    .from("voters")
    .update({ is_admin: isAdmin })
    .eq("id", voterId);
  revalidatePath("/admin/voters");
}

export async function updateVoter(formData: FormData) {
  const supabase = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const invitationCode = String(formData.get("invitation_code") ?? "").trim();
  if (!id || name.length < 1 || email.length < 3) return;

  await supabase
    .from("voters")
    .update({
      name,
      email,
      invitation_code: invitationCode || "GUEST",
    })
    .eq("id", id);
  revalidatePath("/admin/voters");
}

export async function resetVoterPassword(
  voterId: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await assertAdmin();
  if (newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  const { data: voter } = await supabase
    .from("voters")
    .select("user_id, email")
    .eq("id", voterId)
    .maybeSingle();
  if (!voter?.user_id) {
    return {
      ok: false,
      error: "This voter has no linked auth account — nothing to reset.",
    };
  }
  const { error } = await supabase.auth.admin.updateUserById(voter.user_id, {
    password: newPassword,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/voters");
  return { ok: true };
}

export async function deleteVoter(voterId: string) {
  const supabase = await assertAdmin();
  // Look up the linked auth user so we can remove that too.
  const { data: voter } = await supabase
    .from("voters")
    .select("user_id")
    .eq("id", voterId)
    .maybeSingle();

  // Activity tables first (cat_affection has FK to voters; hearts, spins,
  // coupons cascade well enough but be explicit for safety).
  await supabase.from("wheel_spins").delete().eq("voter_id", voterId);
  await supabase.from("coupons").delete().eq("voter_id", voterId);
  await supabase.from("hearts").delete().eq("voter_id", voterId);
  await supabase.from("cat_affection").delete().eq("voter_id", voterId);
  await supabase.from("voters").delete().eq("id", voterId);

  // Best-effort: drop the auth.users row too. Ignored if missing.
  if (voter?.user_id) {
    try {
      await supabase.auth.admin.deleteUser(voter.user_id);
    } catch {
      // Don't fail the whole action if the auth user is already gone.
    }
  }
  revalidatePath("/admin/voters");
  revalidatePath("/admin");
}

// ---------- Voting seasons ----------

export async function createSeason(formData: FormData) {
  const supabase = await assertAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const starts_at = String(formData.get("starts_at") ?? "").trim();
  const ends_at = String(formData.get("ends_at") ?? "").trim();
  if (!name || !starts_at || !ends_at) return;
  await supabase.from("voting_seasons").insert({
    name,
    starts_at: new Date(starts_at).toISOString(),
    ends_at: new Date(ends_at).toISOString(),
    status: "open",
  });
  revalidatePath("/admin/seasons");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

export async function updateSeason(formData: FormData) {
  const supabase = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const starts_at = String(formData.get("starts_at") ?? "").trim();
  const ends_at = String(formData.get("ends_at") ?? "").trim();
  if (!id || !name || !starts_at || !ends_at) return;
  await supabase
    .from("voting_seasons")
    .update({
      name,
      starts_at: new Date(starts_at).toISOString(),
      ends_at: new Date(ends_at).toISOString(),
    })
    .eq("id", id);
  revalidatePath("/admin/seasons");
  revalidatePath("/", "layout");
}

/**
 * Manually close a season. Computes the winner (cat with most hearts that
 * were tagged with this season's id) and writes it to winner_cat_id.
 */
export async function closeSeason(seasonId: string) {
  const supabase = await assertAdmin();

  // Compute winner: most hearts tagged with this season.
  const { data: hearts } = await supabase
    .from("hearts")
    .select("cat_id")
    .eq("season_id", seasonId);

  let winnerCatId: string | null = null;
  if (hearts && hearts.length > 0) {
    const tally = new Map<string, number>();
    for (const h of hearts) {
      tally.set(h.cat_id, (tally.get(h.cat_id) ?? 0) + 1);
    }
    let max = 0;
    for (const [catId, n] of tally) {
      if (n > max) {
        max = n;
        winnerCatId = catId;
      }
    }
  }

  await supabase
    .from("voting_seasons")
    .update({ status: "closed", winner_cat_id: winnerCatId })
    .eq("id", seasonId);
  revalidatePath("/admin/seasons");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

export async function reopenSeason(seasonId: string) {
  const supabase = await assertAdmin();
  await supabase
    .from("voting_seasons")
    .update({ status: "open", winner_cat_id: null })
    .eq("id", seasonId);
  revalidatePath("/admin/seasons");
  revalidatePath("/", "layout");
}

export async function deleteSeason(seasonId: string) {
  const supabase = await assertAdmin();
  // Hearts that were tagged with this season get their season_id nulled by
  // the ON DELETE SET NULL FK, so heart history survives.
  await supabase.from("voting_seasons").delete().eq("id", seasonId);
  revalidatePath("/admin/seasons");
  revalidatePath("/", "layout");
}

// ---------- Wheel rewards ----------

export async function createWheelReward(formData: FormData) {
  const supabase = await assertAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const wheel_label = String(formData.get("wheel_label") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim();
  const type = String(formData.get("type") ?? "win") as "win" | "lose";
  const coupon_title =
    String(formData.get("coupon_title") ?? "").trim() || null;
  const sort_order = Number(formData.get("sort_order") ?? 0);
  if (!label || !wheel_label || !emoji) return;
  await supabase.from("wheel_rewards").insert({
    label,
    wheel_label,
    emoji,
    type,
    coupon_title: type === "win" ? coupon_title : null,
    sort_order: Number.isFinite(sort_order) ? sort_order : 0,
    is_active: true,
  });
  revalidatePath("/admin/rewards");
  revalidatePath("/", "layout");
}

export async function updateWheelReward(formData: FormData) {
  const supabase = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const wheel_label = String(formData.get("wheel_label") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim();
  const type = String(formData.get("type") ?? "win") as "win" | "lose";
  const coupon_title =
    String(formData.get("coupon_title") ?? "").trim() || null;
  const sort_order = Number(formData.get("sort_order") ?? 0);
  if (!id) return;
  await supabase
    .from("wheel_rewards")
    .update({
      label,
      wheel_label,
      emoji,
      type,
      coupon_title: type === "win" ? coupon_title : null,
      sort_order: Number.isFinite(sort_order) ? sort_order : 0,
    })
    .eq("id", id);
  revalidatePath("/admin/rewards");
  revalidatePath("/", "layout");
}

export async function toggleWheelReward(id: string, isActive: boolean) {
  const supabase = await assertAdmin();
  await supabase
    .from("wheel_rewards")
    .update({ is_active: isActive })
    .eq("id", id);
  revalidatePath("/admin/rewards");
  revalidatePath("/", "layout");
}

export async function deleteWheelReward(id: string) {
  const supabase = await assertAdmin();
  await supabase.from("wheel_rewards").delete().eq("id", id);
  revalidatePath("/admin/rewards");
  revalidatePath("/", "layout");
}

// ---------- App settings ----------

export async function updateSetting(key: string, value: string) {
  const supabase = await assertAdmin();
  await supabase.from("app_settings").upsert(
    {
      setting_key: key,
      setting_value: value,
    },
    { onConflict: "setting_key" },
  );
  revalidatePath("/admin/settings");
}

/**
 * Voter service — invitation validation + voter row management.
 *
 * Every function follows the same pattern:
 *   - If Supabase isn't configured → return a safe default
 *   - Run the query; on error, log + return a safe default
 *   - Never throw
 *
 * The caller (page.tsx) treats a null/false return as "fall back to
 * localStorage" rather than "feature broken".
 */

import { getSupabaseClient } from "../client";

// ---------------------------------------------------------------------------
// Invitation code
// ---------------------------------------------------------------------------

/**
 * Check whether the given invitation code is in the whitelist and active.
 *
 * Returns:
 *   - true  → code is valid, OR Supabase isn't configured (fail-open: don't
 *             block dev work when the backend is offline)
 *   - false → code exists but is_active=false, OR no row matches
 *
 * Network/RLS errors are logged and fail-open (return true) so a broken
 * backend doesn't lock the user out of the app.
 */
export async function validateInvitationCode(code: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return true;

  const trimmed = code.trim();
  if (trimmed.length === 0) return false;

  const { data, error } = await client
    .from("invitation_codes")
    .select("is_active")
    .eq("code", trimmed)
    .maybeSingle();

  if (error) {
    // Network / RLS / other — fail open so the user can still vote.
    console.warn("[voters] validateInvitationCode failed:", error.message);
    return true;
  }

  if (!data) return false;
  return data.is_active === true;
}

/**
 * Bump the invitation code's usage_count by 1. Fire-and-forget; failures
 * are silent. Useful for marketing attribution, never blocks the user.
 */
async function incrementInvitationUsage(code: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const trimmed = code.trim();
  if (trimmed.length === 0) return;

  // Read-modify-write — not atomic, but acceptable for analytics counters.
  const { data } = await client
    .from("invitation_codes")
    .select("usage_count")
    .eq("code", trimmed)
    .maybeSingle();
  if (!data) return;

  await client
    .from("invitation_codes")
    .update({ usage_count: (data.usage_count ?? 0) + 1 })
    .eq("code", trimmed);
}

// ---------------------------------------------------------------------------
// Voter row
// ---------------------------------------------------------------------------

export type VoterServiceProfile = {
  name: string;
  email: string;
  phone: string;
  invitationCode: string;
  deviceId: string;
};

/**
 * Find a voter by email, or create one. Returns the row's UUID for use as
 * a foreign key on hearts / cat_affection / coupons / wheel_spins. Returns
 * null when Supabase is unavailable — the caller continues with their
 * localStorage-only profile.
 */
export async function getOrCreateVoter(
  profile: VoterServiceProfile,
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const normalisedEmail = profile.email.trim().toLowerCase();
  if (normalisedEmail.length === 0) return null;

  // Try to find existing voter by email.
  const { data: existing, error: findError } = await client
    .from("voters")
    .select("id, device_id")
    .eq("email", normalisedEmail)
    .maybeSingle();

  if (findError) {
    console.warn("[voters] getOrCreateVoter find failed:", findError.message);
    return null;
  }

  if (existing) {
    // If the voter is on a new device, freshen device_id + updated_at.
    if (existing.device_id !== profile.deviceId) {
      const { error: updateError } = await client
        .from("voters")
        .update({ device_id: profile.deviceId })
        .eq("id", existing.id);
      if (updateError) {
        console.warn("[voters] device_id refresh failed:", updateError.message);
      }
    }
    return existing.id;
  }

  // No row yet — create one.
  const { data: created, error: insertError } = await client
    .from("voters")
    .insert({
      name: profile.name.trim(),
      email: normalisedEmail,
      phone: profile.phone.trim(),
      invitation_code: profile.invitationCode.trim(),
      device_id: profile.deviceId,
    })
    .select("id")
    .single();

  if (insertError) {
    console.warn("[voters] getOrCreateVoter insert failed:", insertError.message);
    return null;
  }

  // Fire-and-forget analytics bump.
  void incrementInvitationUsage(profile.invitationCode);

  return created.id;
}

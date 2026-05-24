"use server";

/**
 * Server actions for auth flows: sign up, sign in, sign out.
 * Called from form components in /signup, /signin, /profile, and the
 * sign-out button in the header.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase/ssr/server";
import { getOrCreateDeviceId } from "@/lib/voterStorage";

// We can't read localStorage from the server — the deviceId is set in the
// browser. For server actions we derive a fallback (request fingerprint
// would be ideal; for now we use a synthetic placeholder until the client
// syncs it on next page load).
const SERVER_DEVICE_FALLBACK = "server_unknown";

// Emails that are auto-promoted to admin on signup. Mirrors the trigger in
// supabase/auth_migration.sql so a fresh signup gets is_admin=true even
// though the voter row is upserted after the trigger fires.
const ADMIN_EMAILS = new Set<string>(["cafe@siamesecat.cafe"]);

export type AuthFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  return null;
}

// ---------- Sign up ----------

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const invitationCodeRaw = String(formData.get("invitationCode") ?? "").trim();
  // Invitation code is optional now — accept anything, default to GUEST.
  const invitationCode = invitationCodeRaw.length > 0 ? invitationCodeRaw : "GUEST";
  const nextRaw = String(formData.get("next") ?? "/");
  const nextPath = nextRaw.startsWith("/") ? nextRaw : "/";

  // ---- Local validation ----
  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Please enter your name";
  if (!validateEmail(email)) fieldErrors.email = "Enter a valid email";
  const passwordError = validatePassword(password);
  if (passwordError) fieldErrors.password = passwordError;
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // ---- Create the auth user via admin API ----
  // Using admin.createUser with email_confirm:true skips Supabase's
  // confirmation email entirely (avoids the 4-emails-per-hour rate limit
  // on the built-in SMTP). The user is created in an already-confirmed
  // state — the next step bounces them to /signin to complete the loop.
  const admin = createServiceRoleClient();
  const { data: createResult, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

  if (createError) {
    const msg = createError.message.toLowerCase();
    if (
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("exists")
    ) {
      return {
        ok: false,
        fieldErrors: {
          email:
            "An account with this email already exists. Try signing in instead.",
        },
      };
    }
    return { ok: false, error: createError.message };
  }
  if (!createResult.user) {
    return { ok: false, error: "Signup failed — please try again." };
  }

  // ---- Insert/link the voter row ----
  // Use the service-role client so RLS doesn't block us — this is a trusted
  // server action and the user was just created above. The trigger we added
  // in auth_migration.sql already links any existing voter by email to this
  // auth user. We still UPSERT to be defensive: if there's no voter row yet,
  // we create one.
  const { error: voterError } = await admin.from("voters").upsert(
    {
      user_id: createResult.user.id,
      email,
      name,
      phone: null,
      invitation_code: invitationCode,
      device_id: SERVER_DEVICE_FALLBACK,
      is_admin: ADMIN_EMAILS.has(email),
    },
    { onConflict: "email" },
  );
  if (voterError) {
    return {
      ok: false,
      error: `Account created but profile failed: ${voterError.message}`,
    };
  }

  // Done. Account + voter row created. Send them to the sign-in page with
  // their email pre-filled so they can complete the loop themselves.
  const params = new URLSearchParams({
    email,
    signedUp: "1",
    next: nextPath,
  });
  redirect(`/signin?${params.toString()}`);
}

// ---------- Sign in ----------

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!validateEmail(email))
    return { ok: false, fieldErrors: { email: "Enter a valid email" } };
  if (password.length === 0)
    return {
      ok: false,
      fieldErrors: { password: "Password is required" },
    };

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      ok: false,
      error:
        error.message === "Invalid login credentials"
          ? "Wrong email or password. Please try again."
          : error.message,
    };
  }

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/");
}

// ---------- Sign out ----------

export async function signOutAction() {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

// Touch to satisfy unused import in some bundlers.
void getOrCreateDeviceId;

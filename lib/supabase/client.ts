/**
 * Supabase client — Phase 3A foundation.
 *
 * A single typed client instance for use throughout the frontend. Reads
 * configuration from public env vars:
 *
 *   NEXT_PUBLIC_SUPABASE_URL        — your project's REST URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   — anon (publishable) key
 *
 * Both are exposed to the browser bundle by Next.js because of the
 * `NEXT_PUBLIC_` prefix — that's fine: the anon key is designed for public
 * use. Row Level Security is what protects user data, not key secrecy.
 *
 * Currently NOT wired into any UI flow (Phase 3B will do that). Importing
 * this module is safe but it won't run any queries until you call
 * `supabase.from(...)`.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// ---------------------------------------------------------------------------
// Env reading
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True when both required env vars are present. Allows the rest of the app
 * to gracefully no-op when Supabase isn't configured (e.g., before the
 * developer fills in `.env.local`).
 */
export const isSupabaseConfigured: boolean =
  typeof SUPABASE_URL === "string" &&
  SUPABASE_URL.length > 0 &&
  typeof SUPABASE_ANON_KEY === "string" &&
  SUPABASE_ANON_KEY.length > 0;

// ---------------------------------------------------------------------------
// Client (lazy, memoised)
// ---------------------------------------------------------------------------

let cachedClient: SupabaseClient<Database> | null = null;

/**
 * Get the singleton Supabase client. Returns `null` when env vars are
 * missing — callers should treat that as "feature disabled" rather than
 * "throw". This lets the app keep working off localStorage during the
 * transition period in Phase 3A.
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) return null;
  if (cachedClient) return cachedClient;

  cachedClient = createClient<Database>(
    SUPABASE_URL as string,
    SUPABASE_ANON_KEY as string,
    {
      auth: {
        // We don't have auth wired yet. When we do, swap this for the
        // Next.js cookie-based session helper from @supabase/ssr.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  return cachedClient;
}

/**
 * Throwing variant — for code paths that REQUIRE Supabase (e.g., Phase 3B
 * server actions). Use the non-throwing `getSupabaseClient()` everywhere
 * else so the localStorage fallback can still run.
 */
export function requireSupabaseClient(): SupabaseClient<Database> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.",
    );
  }
  return client;
}

/**
 * Server-side Supabase client — for server components, route handlers, and
 * server actions. Reads/writes auth cookies through Next.js's cookies() API.
 *
 * Use this whenever you need to query Supabase from server code that should
 * respect the authenticated user's session.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "../database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createServerSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  const cookieStore = cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — cookie writes happen via the
          // middleware refresh path instead. Safe to ignore here.
        }
      },
    },
  });
}

/**
 * Server-side client using the SERVICE ROLE key — bypasses RLS. Use only
 * from trusted server code (admin operations, scheduled jobs). NEVER ship
 * the service-role key to the browser.
 */
export function createServiceRoleClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createServerClient<Database>(SUPABASE_URL, serviceKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // No cookies — this client is for privileged server-only work.
      },
    },
  });
}

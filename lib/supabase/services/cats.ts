/**
 * Cats service — loads the candidate roster from Supabase.
 *
 * In Phase 3B we don't replace the UI's source of cat data (still
 * data/cats.ts), but we DO need the slug → UUID mapping so other services
 * (hearts, affection, etc.) can insert rows with the correct foreign keys.
 *
 * The caller (page.tsx) invokes loadCatsFromSupabase() once on mount and
 * passes the result to setCatIdMap(). If Supabase is unavailable, the map
 * stays empty and every write-path service no-ops gracefully.
 */

import { getSupabaseClient } from "../client";
import type { CatRow } from "../database.types";
import { setCatIdMap } from "./catIdMap";

/**
 * Fetch every active cat from Supabase. Returns null when Supabase is
 * unavailable or the query fails — callers should treat that as "stay
 * on the local mock data".
 */
export async function getCats(): Promise<CatRow[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("cats")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[cats] getCats failed:", error.message);
    return null;
  }

  return data ?? [];
}

/**
 * Convenience: load cats AND populate the slug→uuid map in one call.
 * Returns the rows so the caller can still reach into them if it wants
 * Supabase image_urls / story_urls / descriptions (we don't use those yet
 * in Phase 3B, but a future phase will).
 */
export async function loadCatsAndCacheIds(): Promise<CatRow[] | null> {
  const rows = await getCats();
  if (!rows) return null;
  setCatIdMap(rows.map((r) => ({ slug: r.slug, id: r.id })));
  return rows;
}

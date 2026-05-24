/**
 * In-memory slug ↔ UUID map for cats.
 *
 * The local Cat type uses numeric IDs (1..16). Supabase uses UUIDs. We
 * bridge them by slug, which is derived from `cat.name.toLowerCase()` and
 * stored explicitly in the `cats.slug` column.
 *
 * The map is populated once at app mount when `getCats()` succeeds. If
 * Supabase is unavailable, the map stays empty and every service that
 * needs a UUID returns null — at which point the caller falls back to
 * localStorage.
 *
 * Lives at module scope on purpose: it's a cache, not React state. No
 * component re-renders when it changes.
 */

const slugToUuid: Map<string, string> = new Map();

/** Derive the canonical slug for a local cat. Mirrors `cats.slug` in DB. */
export function slugForCat(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}

/** Replace the map with a fresh set of slug→uuid entries. */
export function setCatIdMap(entries: Array<{ slug: string; id: string }>) {
  slugToUuid.clear();
  for (const e of entries) slugToUuid.set(e.slug, e.id);
}

/** Look up a cat's UUID by its slug. Returns null when unknown. */
export function getCatUuid(slug: string): string | null {
  return slugToUuid.get(slug) ?? null;
}

/** Same as getCatUuid but accepts a cat name (derives the slug). */
export function getCatUuidByName(name: string): string | null {
  return getCatUuid(slugForCat(name));
}

/** True when the map has been populated (i.e., Supabase loaded cats). */
export function hasCatIdMap(): boolean {
  return slugToUuid.size > 0;
}

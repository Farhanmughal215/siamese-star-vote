/**
 * Per-cat affection — long-term relationship layer that sits on top of the
 * 5-hour cooldown. Every successful heart increments `heartsGiven` and
 * re-derives an affection level (1-5) by hard threshold.
 *
 * Storage key: "catAffection"
 *   {
 *     [stringifiedCatId]: { catId, catName, heartsGiven, affectionLevel, lastHeartedAt }
 *   }
 *
 * SSR-safe (no-op on the server) and silently degrades on quota / private
 * mode write failures, matching the rest of voterStorage.
 */

// ---------- Types ----------

export type AffectionLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type CatAffection = {
  catId: number;
  catName: string;
  heartsGiven: number;
  affectionLevel: AffectionLevel;
  /** Epoch ms of the most recent heart for this cat. */
  lastHeartedAt: number;
};

export type AffectionMap = Record<string, CatAffection>;

export type AffectionLevelMeta = {
  level: AffectionLevel;
  /** Minimum heartsGiven to reach this level. */
  threshold: number;
  label: string;
  emoji: string;
};

// ---------- Constants ----------

const KEY = "catAffection";

/**
 * Level table, indexed by level number so `AFFECTION_LEVELS[level]` always
 * returns the matching meta. Sorted ascending by threshold.
 */
export const AFFECTION_LEVELS: AffectionLevelMeta[] = [
  { level: 0, threshold: 0, label: "—", emoji: "" },
  { level: 1, threshold: 1, label: "New Friend", emoji: "🐾" },
  { level: 2, threshold: 3, label: "Cat Buddy", emoji: "💕" },
  { level: 3, threshold: 7, label: "Trusted Visitor", emoji: "🌸" },
  { level: 4, threshold: 15, label: "Favorite Human", emoji: "💖" },
  { level: 5, threshold: 30, label: "Cat Family", emoji: "👑" },
];

// ---------- Pure level math ----------

export function levelForHearts(hearts: number): AffectionLevel {
  if (hearts >= 30) return 5;
  if (hearts >= 15) return 4;
  if (hearts >= 7) return 3;
  if (hearts >= 3) return 2;
  if (hearts >= 1) return 1;
  return 0;
}

export function getAffectionLevelMeta(level: AffectionLevel): AffectionLevelMeta {
  return AFFECTION_LEVELS[level] ?? AFFECTION_LEVELS[0];
}

/** Heart count needed to reach the next level. Returns null when maxed out. */
export function nextLevelThreshold(level: AffectionLevel): number | null {
  if (level >= 5) return null;
  return AFFECTION_LEVELS[level + 1].threshold;
}

/** Progress (0..1) toward the next affection level. Caps at 1 when maxed. */
export function progressToNextLevel(hearts: number): number {
  const level = levelForHearts(hearts);
  const next = nextLevelThreshold(level);
  if (next === null) return 1;
  const prev = AFFECTION_LEVELS[level].threshold;
  return Math.min(1, Math.max(0, (hearts - prev) / (next - prev)));
}

// ---------- Storage IO ----------

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeMap(map: AffectionMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // quota / private mode — fail soft
  }
}

function isValidEntry(entry: unknown): entry is CatAffection {
  if (!entry || typeof entry !== "object") return false;
  const obj = entry as Record<string, unknown>;
  return (
    typeof obj.catId === "number" &&
    typeof obj.catName === "string" &&
    typeof obj.heartsGiven === "number" &&
    typeof obj.affectionLevel === "number" &&
    typeof obj.lastHeartedAt === "number"
  );
}

/** Read the affection map. Drops any corrupted entries. */
export function getCatAffection(): AffectionMap {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(KEY);
  const parsed = safeParse<unknown>(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: AffectionMap = {};
  for (const [key, value] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    if (isValidEntry(value)) out[key] = value;
  }
  return out;
}

// ---------- Mutators ----------

export type RecordHeartResult = {
  entry: CatAffection;
  previousLevel: AffectionLevel;
  /** True when this heart pushed the cat into a new affection level. */
  leveledUp: boolean;
};

/**
 * Record a heart for the given cat. Increments heartsGiven, re-derives the
 * level, persists, and returns the new entry plus a `leveledUp` flag so
 * callers can queue a celebration toast.
 */
export function recordHeart(
  catId: number,
  catName: string,
): RecordHeartResult {
  const map = getCatAffection();
  const key = String(catId);
  const existing = map[key];
  const previousLevel: AffectionLevel = existing?.affectionLevel ?? 0;
  const heartsGiven = (existing?.heartsGiven ?? 0) + 1;
  const affectionLevel = levelForHearts(heartsGiven);
  const entry: CatAffection = {
    catId,
    catName,
    heartsGiven,
    affectionLevel,
    lastHeartedAt: Date.now(),
  };
  map[key] = entry;
  writeMap(map);
  return { entry, previousLevel, leveledUp: affectionLevel > previousLevel };
}

/**
 * Roll back a single heart for the given cat. Used by the 15-minute undo.
 * Returns the updated entry, or null when the entry was removed entirely
 * (heartsGiven reached 0).
 */
export function decrementHeart(catId: number): CatAffection | null {
  if (typeof window === "undefined") return null;
  const map = getCatAffection();
  const key = String(catId);
  const existing = map[key];
  if (!existing) return null;
  const heartsGiven = existing.heartsGiven - 1;
  if (heartsGiven <= 0) {
    delete map[key];
    writeMap(map);
    return null;
  }
  const updated: CatAffection = {
    ...existing,
    heartsGiven,
    affectionLevel: levelForHearts(heartsGiven),
  };
  map[key] = updated;
  writeMap(map);
  return updated;
}

// ---------- Derived stats ----------

/** Total hearts across all cats — the "Memory Book" headline number. */
export function totalHeartsAcrossCats(map: AffectionMap): number {
  let total = 0;
  for (const entry of Object.values(map)) total += entry.heartsGiven;
  return total;
}

/** The cat the user has hearted most. Null on an empty map. */
export function favoriteCatIdFromAffection(map: AffectionMap): number | null {
  let bestId: number | null = null;
  let bestCount = 0;
  for (const entry of Object.values(map)) {
    if (entry.heartsGiven > bestCount) {
      bestId = entry.catId;
      bestCount = entry.heartsGiven;
    }
  }
  return bestId;
}

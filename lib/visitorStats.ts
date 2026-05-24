/**
 * Visitor stats + milestone system. Pure localStorage, frontend-only.
 *
 * Storage key: "visitorStats"
 *
 * Each helper is SSR-safe (no-op on the server) and silently degrades
 * on quota / private-mode failures.
 */

import { getLocalDateString } from "./voterStorage";

// ---------- Types ----------

export type VisitorStats = {
  totalVotes: number;
  totalCoupons: number;
  favoriteCatId: number | null;
  lastVotedCatId: number | null;
  visitCount: number;
  /** YYYY-MM-DD of the most recent visit increment. */
  lastVisitDate: string | null;
  /** IDs of milestones already shown — never shown twice. */
  awardedMilestones: string[];
};

export type SupporterLevel = {
  /** Minimum totalVotes required. */
  threshold: number;
  label: string;
  emoji: string;
};

export type Milestone = {
  id: string;
  title: string;
  emoji: string;
  /** One-line description shown in the toast. */
  description: string;
};

// ---------- Constants ----------

const STORAGE_KEY = "visitorStats";

export const SUPPORTER_LEVELS: SupporterLevel[] = [
  { threshold: 0, label: "Café Guest", emoji: "🐾" },
  { threshold: 1, label: "Cat Friend", emoji: "💕" },
  { threshold: 3, label: "Cat Supporter", emoji: "💖" },
  { threshold: 7, label: "Siamese Guardian", emoji: "✨" },
  { threshold: 15, label: "Cat Council Member", emoji: "👑" },
  { threshold: 30, label: "Mayor Maker", emoji: "🏆" },
];

const ALL_MILESTONES: Milestone[] = [
  {
    id: "first_vote",
    title: "First Heart Shared",
    emoji: "🐾",
    description: "Welcome to the Cat Mayor Election — your first heart is in.",
  },
  {
    id: "three_votes",
    title: "3 Hearts Shared with Rescue Cats",
    emoji: "💖",
    description: "Three days of warmth for our rescued cats. Thank you.",
  },
  {
    id: "first_coupon",
    title: "First Coupon Discovered",
    emoji: "🎁",
    description: "Show this at the café for your treat — and come back for more.",
  },
  {
    id: "five_visits",
    title: "5 Visits to the Cat Council",
    emoji: "✨",
    description: "The cats are starting to recognize you. Keep coming back 🩷",
  },
  {
    id: "loyal_supporter",
    title: "Loyal Cat Supporter Badge Unlocked",
    emoji: "👑",
    description: "10 hearts shared. The café feels lucky to have you.",
  },
  {
    id: "level_cat_supporter",
    title: "Supporter Level: Cat Supporter",
    emoji: "💖",
    description: "You've reached the second supporter tier.",
  },
  {
    id: "level_siamese_guardian",
    title: "Supporter Level: Siamese Guardian",
    emoji: "✨",
    description: "Seven hearts shared — the Council notices you.",
  },
  {
    id: "level_council",
    title: "Supporter Level: Cat Council Member",
    emoji: "👑",
    description: "The senior cats invited you in. Welcome.",
  },
  {
    id: "level_mayor_maker",
    title: "Supporter Level: Mayor Maker",
    emoji: "🏆",
    description: "Thirty hearts. You shape the election itself.",
  },
];

const MILESTONE_BY_ID = Object.fromEntries(
  ALL_MILESTONES.map((m) => [m.id, m]),
) as Record<string, Milestone>;

// ---------- Defaults + IO ----------

function defaultStats(): VisitorStats {
  return {
    totalVotes: 0,
    totalCoupons: 0,
    favoriteCatId: null,
    lastVotedCatId: null,
    visitCount: 0,
    lastVisitDate: null,
    awardedMilestones: [],
  };
}

function safeRead(): VisitorStats {
  if (typeof window === "undefined") return defaultStats();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultStats();
    // Merge with defaults so missing fields don't crash callers.
    return { ...defaultStats(), ...parsed };
  } catch {
    return defaultStats();
  }
}

function safeWrite(stats: VisitorStats): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

export function getVisitorStats(): VisitorStats {
  return safeRead();
}

// ---------- Derivations ----------

export function getSupporterLevel(totalVotes: number): SupporterLevel {
  // Highest level whose threshold is <= totalVotes.
  let current = SUPPORTER_LEVELS[0];
  for (const lvl of SUPPORTER_LEVELS) {
    if (totalVotes >= lvl.threshold) current = lvl;
  }
  return current;
}

// ---------- Mutators ----------

/**
 * Increment visitCount when the visitor returns on a new local day.
 * Returns the updated stats so the caller can detect milestones.
 */
export function recordVisitIfNewDay(): VisitorStats {
  const stats = safeRead();
  const today = getLocalDateString();
  if (stats.lastVisitDate === today) {
    // Already counted today — return stats unchanged.
    return stats;
  }
  const next: VisitorStats = {
    ...stats,
    visitCount: stats.visitCount + 1,
    lastVisitDate: today,
  };
  safeWrite(next);
  return next;
}

/**
 * Increment totalVotes and record the cat as both lastVoted and favorite.
 * Returns the updated stats.
 */
export function recordVote(catId: number): VisitorStats {
  const stats = safeRead();
  const next: VisitorStats = {
    ...stats,
    totalVotes: stats.totalVotes + 1,
    lastVotedCatId: catId,
    // Favorite = most recently voted cat (matches UserWelcomeCard's source).
    favoriteCatId: catId,
  };
  safeWrite(next);
  return next;
}

/**
 * Roll back totalVotes by one — paired with the 15-minute undo path.
 * Floors at 0 so storage never reads negative.
 */
export function decrementVote(): VisitorStats {
  const stats = safeRead();
  if (stats.totalVotes <= 0) return stats;
  const next: VisitorStats = {
    ...stats,
    totalVotes: stats.totalVotes - 1,
  };
  safeWrite(next);
  return next;
}

/** Increment totalCoupons. Returns updated stats. */
export function recordCoupon(): VisitorStats {
  const stats = safeRead();
  const next: VisitorStats = { ...stats, totalCoupons: stats.totalCoupons + 1 };
  safeWrite(next);
  return next;
}

/** Roll back totalCoupons by one — used when undo removes a coupon. */
export function decrementCoupon(): VisitorStats {
  const stats = safeRead();
  if (stats.totalCoupons <= 0) return stats;
  const next: VisitorStats = {
    ...stats,
    totalCoupons: stats.totalCoupons - 1,
  };
  safeWrite(next);
  return next;
}

/**
 * Award a milestone if it hasn't been awarded yet. Returns the Milestone
 * if it was newly awarded, otherwise null.
 */
export function awardMilestone(id: string): Milestone | null {
  const stats = safeRead();
  if (stats.awardedMilestones.includes(id)) return null;
  const milestone = MILESTONE_BY_ID[id];
  if (!milestone) return null;
  const next: VisitorStats = {
    ...stats,
    awardedMilestones: [...stats.awardedMilestones, id],
  };
  safeWrite(next);
  return milestone;
}

// ---------- Milestone evaluation ----------

/**
 * Given a fresh-after-vote VisitorStats, returns the list of milestones
 * that should be awarded right now. Caller is expected to call
 * awardMilestone() for each one to persist and avoid re-awarding.
 */
export function pendingVoteMilestones(stats: VisitorStats): Milestone[] {
  const out: Milestone[] = [];
  const candidates: string[] = [];

  if (stats.totalVotes === 1) candidates.push("first_vote");
  if (stats.totalVotes === 3) candidates.push("three_votes");
  if (stats.totalVotes === 10) candidates.push("loyal_supporter");

  // Level-up milestones — only when crossing a threshold this vote.
  // We detect by comparing the threshold of the level at votes N and N-1.
  const prev = getSupporterLevel(stats.totalVotes - 1);
  const curr = getSupporterLevel(stats.totalVotes);
  if (prev.threshold !== curr.threshold) {
    // Map level → milestone id.
    const levelId =
      curr.label === "Cat Supporter"
        ? "level_cat_supporter"
        : curr.label === "Siamese Guardian"
          ? "level_siamese_guardian"
          : curr.label === "Cat Council Member"
            ? "level_council"
            : curr.label === "Mayor Maker"
              ? "level_mayor_maker"
              : null;
    if (levelId) candidates.push(levelId);
  }

  for (const id of candidates) {
    if (!stats.awardedMilestones.includes(id) && MILESTONE_BY_ID[id]) {
      out.push(MILESTONE_BY_ID[id]);
    }
  }
  return out;
}

/** Coupon-related milestones (only "first_coupon" for now). */
export function pendingCouponMilestones(stats: VisitorStats): Milestone[] {
  if (stats.totalCoupons === 1 && !stats.awardedMilestones.includes("first_coupon")) {
    return [MILESTONE_BY_ID.first_coupon];
  }
  return [];
}

/** Visit-count milestones. */
export function pendingVisitMilestones(stats: VisitorStats): Milestone[] {
  if (stats.visitCount === 5 && !stats.awardedMilestones.includes("five_visits")) {
    return [MILESTONE_BY_ID.five_visits];
  }
  return [];
}

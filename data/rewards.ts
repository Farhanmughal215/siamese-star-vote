import type { WheelOutcome, WheelSection } from "@/lib/types";
import type { WheelRewardRow } from "@/lib/supabase/database.types";
import { generateCouponCode } from "@/lib/voterStorage";

/**
 * The 8 wheel sections, in clockwise order starting from the top.
 * Order matters — section index drives the spin landing angle.
 */
export const WHEEL_SECTIONS: WheelSection[] = [
  {
    id: "try-tomorrow",
    label: "Try Tomorrow",
    wheelLabel: "Try Tomorrow",
    emoji: "🐾",
    type: "lose",
  },
  {
    id: "drink-5",
    label: "5% Drink Coupon",
    wheelLabel: "5% Drink",
    emoji: "☕",
    type: "win",
    couponTitle: "5% Off Any Drink",
  },
  {
    id: "almost-lucky",
    label: "Almost Lucky",
    wheelLabel: "Almost Lucky",
    emoji: "✨",
    type: "lose",
  },
  {
    id: "free-topping",
    label: "Free Topping",
    wheelLabel: "Free Topping",
    emoji: "🧁",
    type: "win",
    couponTitle: "Free Topping On Any Drink",
  },
  {
    id: "cat-blessing",
    label: "Cat Blessing",
    wheelLabel: "Cat Blessing",
    emoji: "💖",
    type: "lose",
  },
  {
    id: "dessert-10",
    label: "10% Dessert Coupon",
    wheelLabel: "10% Dessert",
    emoji: "🍰",
    type: "win",
    couponTitle: "10% Off Any Dessert",
  },
  {
    id: "try-again",
    label: "Try Again Tomorrow",
    wheelLabel: "Try Again",
    emoji: "🐱",
    type: "lose",
  },
  {
    id: "lucky-cat-smile",
    label: "Lucky Cat Smile",
    wheelLabel: "Lucky Smile",
    emoji: "😺",
    type: "lose",
  },
];

/** Brand-aligned section colors, cycled in order. */
export const WHEEL_COLORS = [
  "#f5d5dd", // soft pink
  "#d4ebe2", // mint light
  "#fdf5ec", // cream
  "#f3c5cf", // pink light-mid
];

const NO_WIN_MESSAGES = [
  "So close! The cats saved another surprise for tomorrow.",
  "Almost lucky! {name} believes tomorrow is your day.",
  "Your heart still made the cats happy today.",
];

const WIN_MESSAGES = [
  "Lucky paws! You unlocked a café treat.",
  "{name} shared a little reward with you.",
  "A cozy surprise is waiting for you at Siamese Cat Café.",
];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const WIN_PROBABILITY = 0.2; // 80% no-win, 20% win — per spec.
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Roll a wheel outcome based on the configured win probability,
 * then pick a section matching the outcome type. Pure client mock.
 * Used as the fallback when admin-managed rewards aren't loaded.
 */
export function rollWheelOutcome(catName: string): WheelOutcome {
  return rollFromSections(catName, WHEEL_SECTIONS, WIN_PROBABILITY);
}

/** Convert a DB-row reward into the WheelSection shape the UI expects. */
export function sectionFromReward(r: WheelRewardRow): WheelSection {
  return {
    id: r.id,
    label: r.label,
    wheelLabel: r.wheel_label,
    emoji: r.emoji,
    type: r.type,
    couponTitle: r.coupon_title ?? undefined,
  };
}

/**
 * Roll a wheel outcome using the admin-managed reward catalog + win rate.
 * Pure presentation logic — caller wires the result into the modal + spin.
 */
export function rollFromConfig(
  catName: string,
  rewards: WheelRewardRow[],
  winRatePercent: number,
): WheelOutcome {
  const sections = rewards.map(sectionFromReward);
  return rollFromSections(catName, sections, winRatePercent / 100);
}

function rollFromSections(
  catName: string,
  sections: WheelSection[],
  winProbability: number,
): WheelOutcome {
  // Guarantee at least one section of each polarity so the roll can't trap
  // itself on an empty pool when the admin temporarily hides everything.
  const hasWin = sections.some((s) => s.type === "win");
  const hasLose = sections.some((s) => s.type === "lose");
  const isWin =
    hasWin && hasLose
      ? Math.random() < winProbability
      : hasWin
        ? true
        : false;
  const desired = isWin ? "win" : "lose";
  const pool = sections.filter((s) => s.type === desired);
  const section = pool.length > 0 ? pick(pool) : sections[0];
  const template = pick(isWin ? WIN_MESSAGES : NO_WIN_MESSAGES);
  const message = template.replace("{name}", catName);

  return {
    section,
    message,
    coupon:
      isWin && section.couponTitle
        ? {
            title: section.couponTitle,
            code: generateCouponCode(),
            validUntil: Date.now() + SEVEN_DAYS_MS,
            blurb: "Show this coupon to our staff to redeem.",
          }
        : undefined,
  };
}


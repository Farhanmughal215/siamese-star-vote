/**
 * Personalized cat dialogues. The cats "speak" to the user, adapting their
 * tone to:
 *   - the active context (hover, profile, after-heart, cooldown, etc.)
 *   - the user's affection tier with that cat (stranger / early / deep)
 *
 * Pure helper — no React, no storage. Caller passes in the cat + context +
 * voter first name + affection level, and gets back a single rendered line.
 *
 * IMPORTANT: this picks randomly from a pool, so call it inside an event
 * handler / useMemo, never directly during SSR-able render (or you'll get
 * a hydration mismatch).
 */

import type { Cat } from "@/lib/types";
import type { AffectionLevel } from "@/lib/catAffection";

export type DialogueContext =
  | "hover"
  | "profile"
  | "afterHeart"
  | "cooldown"
  | "couponWin"
  | "noCoupon"
  | "returning";

type Tier = "stranger" | "early" | "deep";
type Pool = string[];

// Tokens: {name} → voter first name (or "friend"); {cat} → cat.name
const POOLS: Record<DialogueContext, Record<Tier, Pool>> = {
  hover: {
    stranger: [
      "Hi {name}, I'm {cat}. Thanks for noticing me 🐾",
      "Hello {name}! I'm {cat} — would you stay a while?",
      "Oh — a new face. I'm {cat} 💕",
    ],
    early: [
      "Oh hi, {name}! Good to see you again.",
      "{name}, you came back 💕",
      "Hi again, {name} 🐾",
    ],
    deep: [
      "{name} 💖 my favorite human.",
      "You always know just when to visit, {name}.",
      "There you are, {name}.",
    ],
  },
  profile: {
    stranger: [
      "I'm {cat}. The café feels softer when someone reads my page.",
      "Hi {name}, my story is just getting started — thank you for reading.",
      "Welcome to my little corner of the café 🐾",
    ],
    early: [
      "{name}, your hearts have been keeping me company 🐾",
      "I remember your last visit, {name}.",
      "It's good to see you on my page again, {name} 💕",
    ],
    deep: [
      "We've grown close, {name}. I always wait for your visits.",
      "You're family to me now, {name} 💖",
      "Reading along with you feels like home, {name}.",
    ],
  },
  afterHeart: {
    stranger: [
      "Thank you for your heart, {name} 💖",
      "That heart meant the world to me, {name}.",
      "My first heart from you — I'll remember this 🐾",
    ],
    early: [
      "Another heart from you, {name}? You spoil me 🐾",
      "I felt that one all the way to my whiskers, {name}.",
      "Your hearts always come at the right moment, {name} 💕",
    ],
    deep: [
      "Your hearts keep me going, {name} 💖",
      "You're one of my favorite humans now, {name}.",
      "I don't know what I'd do without you, {name}.",
    ],
  },
  cooldown: {
    stranger: [
      "I'm still feeling loved — come back in a little while 🐾",
      "Save your next heart for later, {name} — I'm cozy right now.",
      "Still glowing from your last visit ✨",
    ],
    early: [
      "I'm purring from your last heart, {name}. Come back soon!",
      "Your last visit warmed me up. Check on me later 🐾",
      "Resting for now, {name}, but I'll be ready again 💕",
    ],
    deep: [
      "Don't worry, {name} — your hearts carry me through the day.",
      "Still glowing from your last heart, {name} 💖",
      "I'm well-loved today, {name}. Save your next heart for me.",
    ],
  },
  couponWin: {
    stranger: [
      "I shared a little café surprise with you 🎁",
      "Look what I found for you, {name} ✨",
      "A small treat from the café — go enjoy it!",
    ],
    early: [
      "Take this treat from the café, {name} 🐾",
      "A small gift, just for you 💕",
      "I asked the café to make this for you, {name}.",
    ],
    deep: [
      "A little something from your friend at the café, {name} 💖",
      "You've earned every treat, {name}. Enjoy!",
      "The café knows you by name now, {name} ✨",
    ],
  },
  noCoupon: {
    stranger: [
      "Your heart made me happy today 🐾",
      "No treat this time, but the warmth was real, {name}.",
      "Today was a quiet kind of magic 💕",
    ],
    early: [
      "Even without a treat, today felt special, {name} 💕",
      "Your visit was the treat, {name}.",
      "Some days are just for purring together, {name}.",
    ],
    deep: [
      "I don't need a treat to feel your love, {name} 💖",
      "Your visit is more than enough, {name}.",
      "Just being with you is the reward, {name}.",
    ],
  },
  returning: {
    stranger: [
      "You came back! That makes me feel seen, {name}.",
      "Hello again, {name} — I hoped you'd visit.",
      "Twice in one season — what a kind human you are 🐾",
    ],
    early: [
      "Welcome back, {name}. I missed your visits 🐾",
      "You're back — my favorite part of the day, {name}.",
      "I was just thinking about you, {name} 💕",
    ],
    deep: [
      "There you are, {name}. The café feels right again 💖",
      "I knew you'd come back, {name}.",
      "Home, with you here, {name}.",
    ],
  },
};

function tierFor(level: AffectionLevel): Tier {
  if (level >= 3) return "deep";
  if (level >= 1) return "early";
  return "stranger";
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export type DialogueInput = {
  cat: Pick<Cat, "name">;
  context: DialogueContext;
  /** Voter's first name. Falls back to "friend" when missing. */
  voterFirstName?: string | null;
  /** Defaults to 0 (stranger tier). */
  affectionLevel?: AffectionLevel;
};

/**
 * Pick one line from the appropriate context+tier pool and interpolate
 * the voter and cat names.
 */
export function getCatDialogue({
  cat,
  context,
  voterFirstName,
  affectionLevel = 0,
}: DialogueInput): string {
  const pool = POOLS[context]?.[tierFor(affectionLevel)] ?? [];
  if (pool.length === 0) return "";
  const name = (voterFirstName ?? "").trim() || "friend";
  return pickRandom(pool)
    .replace(/\{name\}/g, name)
    .replace(/\{cat\}/g, cat.name);
}

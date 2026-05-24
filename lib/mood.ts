"use client";

import { useEffect, useMemo, useState } from "react";

export type Mood = "morning" | "afternoon" | "evening" | "night";

export type MoodInfo = {
  mood: Mood;
  label: string;
  emoji: string;
  /** CSS gradient applied behind the page. */
  pageGradient: string;
  /** Three rgba() strings used by the drifting glow blobs. */
  glowColors: [string, string, string];
  /** Optional accent shadow color for the mood chip. */
  accent: string;
};

/** Time bands per spec: 5–11 morning, 11–17 afternoon, 17–21 evening, else night. */
export function getMoodFromHour(hour: number): Mood {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

const MOOD_DATA: Record<Mood, Omit<MoodInfo, "mood">> = {
  morning: {
    label: "Cozy Morning at Siamese Cat Café",
    emoji: "☀️",
    pageGradient:
      "linear-gradient(135deg, #fff8e7 0%, #fdf5ec 55%, #f3dcc8 100%)",
    glowColors: [
      "rgba(255, 220, 150, 0.50)", // sun warmth top-left
      "rgba(231, 158, 174, 0.32)", // pink right
      "rgba(187, 221, 211, 0.30)", // mint bottom
    ],
    accent: "#d6a45f",
  },
  afternoon: {
    label: "Sunny Café Afternoon",
    emoji: "🌤️",
    pageGradient:
      "linear-gradient(135deg, #fef6df 0%, #fdf5ec 50%, #e9efe8 100%)",
    glowColors: [
      "rgba(255, 220, 170, 0.40)",
      "rgba(187, 221, 211, 0.45)",
      "rgba(231, 158, 174, 0.30)",
    ],
    accent: "#c98f4a",
  },
  evening: {
    label: "Calm Evening Cat Café",
    emoji: "🌙",
    pageGradient:
      "linear-gradient(135deg, #f8d8c8 0%, #fdf5ec 45%, #f3c5cf 100%)",
    glowColors: [
      "rgba(255, 170, 130, 0.45)",
      "rgba(231, 158, 174, 0.50)",
      "rgba(220, 130, 160, 0.35)",
    ],
    accent: "#d57a8e",
  },
  night: {
    label: "Dreamy Night with the Cats",
    emoji: "✨",
    pageGradient:
      "linear-gradient(135deg, #f0e8d8 0%, #ece9dd 50%, #d4ebe2 100%)",
    glowColors: [
      "rgba(187, 221, 211, 0.55)",
      "rgba(143, 196, 179, 0.40)",
      "rgba(231, 158, 174, 0.25)",
    ],
    accent: "#8fc4b3",
  },
};

/**
 * Returns the current MoodInfo. Re-checks every minute so the mood
 * shifts in real time if the user keeps the tab open across a band
 * boundary. SSR-safe: starts in "afternoon" until the client hydrates
 * to avoid hydration-mismatch warnings.
 */
export function useMood(): MoodInfo {
  const [hour, setHour] = useState<number | null>(null);

  useEffect(() => {
    setHour(new Date().getHours());
    const id = window.setInterval(
      () => setHour(new Date().getHours()),
      60_000,
    );
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    const effective = hour ?? 14; // afternoon default on the server
    const mood = getMoodFromHour(effective);
    return { mood, ...MOOD_DATA[mood] };
  }, [hour]);
}

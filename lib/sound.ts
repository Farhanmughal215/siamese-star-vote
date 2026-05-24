"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Sound system for Siamese Star Vote.
 *
 * Sound files are referenced under `/sounds/*.mp3` and bundled with the
 * Next.js public folder. Any missing file fails silently — the system
 * is opt-in and degrades gracefully when assets aren't present yet.
 *
 * Sound is OFF by default. The toggle persists to localStorage so the
 * preference survives reloads.
 */

const STORAGE_KEY = "soundEnabled";
const STORAGE_EVENT = "siamese:soundChanged";

export type SoundName =
  | "pawTap"
  | "sparkle"
  | "wheelSpin"
  | "couponWin"
  | "softMeow"
  | "modalOpen";

export const SOUND_MAP: Record<SoundName, string> = {
  pawTap: "/sounds/paw-tap.mp3",
  sparkle: "/sounds/sparkle.mp3",
  wheelSpin: "/sounds/wheel-spin.mp3",
  couponWin: "/sounds/coupon-win.mp3",
  softMeow: "/sounds/soft-meow.mp3",
  modalOpen: "/sounds/modal-open.mp3",
};

// Per-sound default volume — keep everything soft.
const SOUND_VOLUMES: Record<SoundName, number> = {
  pawTap: 0.25,
  sparkle: 0.3,
  wheelSpin: 0.32,
  couponWin: 0.4,
  softMeow: 0.35,
  modalOpen: 0.2,
};

// ---------- Persistence ----------

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
    // Broadcast within the tab so other useSoundEnabled subscribers update.
    window.dispatchEvent(
      new CustomEvent(STORAGE_EVENT, { detail: { enabled } }),
    );
  } catch {
    // ignore
  }
}

// ---------- Playback ----------

/**
 * Play a sound by name. No-ops when sound is disabled, audio isn't
 * available, or the file fails to load. Never throws.
 */
export function playSound(name: SoundName): void {
  if (typeof window === "undefined") return;
  if (!isSoundEnabled()) return;
  const src = SOUND_MAP[name];
  if (!src) return;
  try {
    const audio = new Audio(src);
    audio.volume = SOUND_VOLUMES[name] ?? 0.3;
    void audio.play().catch(() => {
      // Missing file, autoplay policy, etc. Silent failure is intended.
    });
  } catch {
    // ignore
  }
}

// ---------- React hook ----------

/**
 * Subscribe to the sound-enabled preference. The returned `toggle` flips
 * it and persists immediately; the returned `enabled` mirrors the latest
 * value across tabs (via the storage event) and within the tab (custom
 * event we dispatch on every setSoundEnabled call).
 */
export function useSoundEnabled() {
  const [enabled, setEnabledState] = useState(false);

  // Hydration-safe: read on mount only.
  useEffect(() => {
    setEnabledState(isSoundEnabled());

    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ enabled: boolean }>).detail;
      if (detail) setEnabledState(detail.enabled);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEnabledState(e.newValue === "true");
    };
    window.addEventListener(STORAGE_EVENT, onCustom as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(STORAGE_EVENT, onCustom as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !isSoundEnabled();
    setSoundEnabled(next);
    setEnabledState(next);
    // Tiny acknowledgement sound when turning on so the user knows it works.
    if (next) {
      // playSound checks isSoundEnabled internally — by now it's true.
      playSound("pawTap");
    }
  }, []);

  return { enabled, toggle };
}

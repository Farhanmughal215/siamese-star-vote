"use client";

import { useEffect, useMemo, useState } from "react";

type CountdownTimerProps = {
  /** Epoch ms target. When elapsed, the component shows "Ready now". */
  target: number;
  /** Compact mode for inline chips. */
  compact?: boolean;
  className?: string;
};

function diffParts(ms: number) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { h, m, s, done: clamped === 0 };
}

/**
 * Live countdown that ticks every second. Pure client mock for now —
 * backed by a target timestamp held in page state. Backend can later
 * replace the timestamp source without touching this component.
 */
export default function CountdownTimer({
  target,
  compact = false,
  className = "",
}: CountdownTimerProps) {
  // Hydration-safe: start at "—" and fill in on the client tick.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const parts = useMemo(() => {
    if (now === null) return null;
    return diffParts(target - now);
  }, [now, target]);

  if (!parts) {
    // Hydration placeholder — same layout as the live value.
    return (
      <span className={className} suppressHydrationWarning>
        {compact ? "—" : "—h —m —s"}
      </span>
    );
  }

  if (parts.done) {
    return (
      <span className={className}>
        {compact ? "Ready now" : "Ready now ✨"}
      </span>
    );
  }

  // Compact: "23h 59m"
  if (compact) {
    return (
      <span className={className}>
        {parts.h}h {String(parts.m).padStart(2, "0")}m
      </span>
    );
  }

  // Detailed: "23h 59m 12s"
  return (
    <span className={`tabular-nums ${className}`}>
      {parts.h}h {String(parts.m).padStart(2, "0")}m{" "}
      {String(parts.s).padStart(2, "0")}s
    </span>
  );
}

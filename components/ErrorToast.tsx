"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, X } from "lucide-react";
import { useEffect } from "react";

type ErrorToastProps = {
  /** Message to display. Toast is open whenever this is non-null. */
  message: string | null;
  /** ms until auto-dismiss. Defaults to 4500. */
  durationMs?: number;
  onClose: () => void;
};

/**
 * Lightweight error/info toast for service failures (invalid invitation
 * code, "vote save failed", Supabase unavailable, etc.). On-brand:
 * cream surface, pink-dark border, brown text — never red. The voice is
 * "warm but honest", not "alarming".
 *
 * Lives at top-right so it doesn't collide with LiveHeartsFeed
 * (bottom-left/center) or the modal flow.
 */
export default function ErrorToast({
  message,
  durationMs = 4500,
  onClose,
}: ErrorToastProps) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(id);
  }, [message, durationMs, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key="error-toast"
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed right-4 top-4 z-50 max-w-[min(92vw,360px)]"
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
        >
          <div
            className="pointer-events-auto flex items-start gap-2.5 rounded-2xl border border-pink-dark/30 bg-cream/95 px-3.5 py-2.5 shadow-card backdrop-blur"
            style={{
              boxShadow:
                "0 10px 30px -10px rgba(213,122,142,0.55), 0 0 0 1px rgba(255,255,255,0.4) inset",
            }}
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-pink-dark"
              strokeWidth={2.4}
              aria-hidden="true"
            />
            <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-brown">
              {message}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss"
              className="rounded-full p-1 text-brown/40 transition hover:bg-brown/5 hover:text-brown/80"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

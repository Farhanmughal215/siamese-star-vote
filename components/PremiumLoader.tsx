"use client";

import { AnimatePresence, motion } from "framer-motion";

type PremiumLoaderProps = {
  open: boolean;
  /** Optional copy below the paw mark. */
  text?: string;
};

/**
 * Soft full-screen transitional overlay.
 *
 * - Cream backdrop with a frosted blur
 * - Center paw mark with a sparkle ring + sweeping wipe
 * - Optional cozy text below
 *
 * Designed to be brief (300–1200ms). Controlled by the parent: pass
 * `open={true}` to show, flip back to `false` to dismiss.
 */
export default function PremiumLoader({ open, text }: PremiumLoaderProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="premium-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 z-[60] flex items-center justify-center"
          aria-live="polite"
          aria-busy="true"
        >
          {/* Backdrop */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cream/85 backdrop-blur-md"
          />

          {/* Sweeping mood-pink wipe — fires once per open */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-pink/20 to-transparent"
            initial={{ x: "-50%" }}
            animate={{ x: "250%" }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />

          {/* Stage */}
          <div className="relative flex flex-col items-center">
            {/* Soft halo ring */}
            <motion.div
              aria-hidden="true"
              className="absolute -inset-6 rounded-full"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(231,158,174,0.4), transparent 70%)",
              }}
              animate={{ scale: [0.95, 1.06, 0.95], opacity: [0.6, 1, 0.6] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Paw mark */}
            <motion.div
              className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink to-pink-dark shadow-card"
              initial={{ scale: 0.7, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 16 }}
            >
              <svg viewBox="0 0 64 64" className="h-10 w-10 text-cream" fill="currentColor" aria-hidden="true">
                <ellipse cx="32" cy="42" rx="14" ry="11" />
                <ellipse cx="14" cy="26" rx="6" ry="8" />
                <ellipse cx="50" cy="26" rx="6" ry="8" />
                <ellipse cx="22" cy="12" rx="5" ry="7" />
                <ellipse cx="42" cy="12" rx="5" ry="7" />
              </svg>
            </motion.div>

            {/* Sparkles orbiting the paw */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <motion.span
                key={i}
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 text-pink-dark"
                style={{ width: 10, height: 10 }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{
                  x: Math.cos((deg * Math.PI) / 180) * 56,
                  y: Math.sin((deg * Math.PI) / 180) * 56,
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1, 1, 0.4],
                }}
                transition={{
                  duration: 1.6,
                  delay: i * 0.08,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                  <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
                </svg>
              </motion.span>
            ))}

            {/* Caption */}
            {text && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="mt-8 font-display text-base font-semibold text-brown sm:text-lg"
              >
                {text}
              </motion.p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

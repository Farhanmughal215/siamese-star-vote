"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Check, Copy, Crown, Download, Heart, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Cat } from "@/lib/types";

type ShareCardPreviewProps = {
  cat: Cat | null;
  onClose: () => void;
};

/**
 * IG-story-style share preview. UI-only — no image generation yet.
 * The "Download Card" button shows a toast-style confirmation but does
 * not produce a real download; that arrives in a later phase.
 */
export default function ShareCardPreview({ cat, onClose }: ShareCardPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (!cat) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [cat, onClose]);

  // Reset the transient UI flags whenever the cat changes / modal reopens.
  useEffect(() => {
    setCopied(false);
    setDownloaded(false);
  }, [cat]);

  const shareText = cat
    ? `I gave my heart to ${cat.name} 🐾 — Siamese Star Vote, the Cat Mayor Election of Siamese Cat Café.`
    : "";

  const handleCopy = async () => {
    if (!cat) return;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable; fail soft.
      setCopied(false);
    }
  };

  const handleDownload = () => {
    // UI-only stub — real image export comes later.
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2200);
  };

  return (
    <AnimatePresence>
      {cat && (
        <motion.div
          key="share-root"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="share-title"
        >
          <motion.div
            className="absolute inset-0 bg-brown/55 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true"
          />

          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative z-10 w-full rounded-t-[28px] sm:max-w-[460px] sm:rounded-[28px]"
          >
            <div className="relative max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-t-[28px] bg-cream shadow-glass-inset scrollbar-none sm:rounded-[28px]">
              <div className="h-1.5 w-full bg-gradient-to-r from-mint via-pink to-pink-dark" />
              <div
                aria-hidden="true"
                className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-brown/15 sm:hidden"
              />

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-brown shadow-soft transition hover:bg-white"
              >
                <X className="h-4 w-4" strokeWidth={2.4} />
              </button>

              <div className="px-5 pb-5 pt-4 sm:px-7 sm:pb-7 sm:pt-6">
                <div className="text-center">
                  <p className="inline-flex items-center gap-1 rounded-full bg-pink/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-pink-dark">
                    Share
                  </p>
                  <h2
                    id="share-title"
                    className="mt-2 font-display text-xl font-bold leading-tight text-brown sm:text-2xl"
                  >
                    Share your vote
                  </h2>
                </div>

                {/* Story card preview */}
                <div className="mt-4 flex justify-center">
                  <StoryCard cat={cat} />
                </div>

                {/* Share text snippet */}
                <div className="mt-4 rounded-2xl border border-brown/10 bg-white/70 px-4 py-3 text-[13px] text-brown/75 backdrop-blur">
                  {shareText}
                </div>

                {/* Actions */}
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <motion.button
                    type="button"
                    onClick={handleCopy}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brown px-5 py-3 text-sm font-semibold text-cream shadow-soft transition hover:bg-brown-400 hover:shadow-card"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" strokeWidth={2.6} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" strokeWidth={2.4} />
                        Copy Share Text
                      </>
                    )}
                  </motion.button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-brown/15 bg-white/80 px-5 py-3 text-sm font-semibold text-brown transition hover:border-brown/40 hover:bg-white active:scale-[0.98]"
                  >
                    {downloaded ? (
                      <>
                        <Check className="h-4 w-4" strokeWidth={2.6} />
                        Saved (preview)
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" strokeWidth={2.4} />
                        Download Card
                      </>
                    )}
                  </button>
                </div>

                <p className="mt-3 text-center text-[11px] text-brown/45">
                  Download is preview-only for now. Real image export coming
                  soon.
                </p>
              </div>

              <div className="h-2 sm:hidden" aria-hidden="true" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ----- Story card (9:16 ratio) -----

function StoryCard({ cat }: { cat: Cat }) {
  return (
    <div
      className="relative aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-[26px] border border-brown/15 shadow-card"
      style={{
        background:
          "linear-gradient(160deg, #fdf5ec 0%, #f3c5cf 45%, #d4ebe2 100%)",
      }}
    >
      {/* Ambient decorations */}
      <span
        aria-hidden="true"
        className="absolute -left-4 top-8 text-pink/40"
      >
        <Heart className="h-8 w-8" fill="currentColor" strokeWidth={0} />
      </span>
      <span
        aria-hidden="true"
        className="absolute -right-3 top-24 text-mint-dark/40"
      >
        <svg viewBox="0 0 64 64" className="h-9 w-9" fill="currentColor">
          <ellipse cx="32" cy="42" rx="14" ry="11" />
          <ellipse cx="14" cy="26" rx="6" ry="8" />
          <ellipse cx="50" cy="26" rx="6" ry="8" />
          <ellipse cx="22" cy="12" rx="5" ry="7" />
          <ellipse cx="42" cy="12" rx="5" ry="7" />
        </svg>
      </span>
      <span
        aria-hidden="true"
        className="absolute bottom-24 left-4 text-pink-dark/40"
      >
        <Heart className="h-5 w-5" fill="currentColor" strokeWidth={0} />
      </span>

      <div className="relative flex h-full flex-col items-center px-4 pb-4 pt-5 text-center">
        {/* Top wordmark */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/65 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-brown backdrop-blur">
          <Crown className="h-3 w-3 text-pink-dark" strokeWidth={2.6} />
          Siamese Star Vote
        </div>

        {/* Cat avatar */}
        <div className="relative mt-4 h-24 w-24 overflow-hidden rounded-full border-[3px] border-cream bg-white shadow-card">
          <Image
            src={cat.image}
            alt={cat.name}
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>

        {/* Main line */}
        <p className="mt-4 font-display text-[15px] font-bold leading-snug text-brown">
          I gave my heart to{" "}
          <span className="text-pink-dark">{cat.name}</span> 🐾
        </p>
        <p className="mt-1 text-[10px] italic text-brown/65">{cat.title}</p>

        {/* Bottom branding */}
        <div className="mt-auto w-full pt-3">
          <p className="font-display text-[11px] font-bold text-brown">
            The Cat Mayor Election
          </p>
          <p className="text-[9px] italic text-brown/55">
            of Siamese Cat Café
          </p>
        </div>
      </div>
    </div>
  );
}

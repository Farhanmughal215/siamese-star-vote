"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import {
  ArrowLeft,
  Clock,
  Download,
  Heart,
  Info,
  Loader2,
  Printer,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CouponReveal from "./CouponReveal";
import CountdownTimer from "./CountdownTimer";
import PrintableCoupon from "./PrintableCoupon";
import CatDialogueBubble from "./CatDialogueBubble";
import { downloadCouponPDF, printCoupon } from "@/lib/couponPdf";
import { getCatDialogue } from "@/lib/catDialogues";
import type { AffectionLevel } from "@/lib/catAffection";
import type { Cat, WheelOutcome } from "@/lib/types";

const PRINTABLE_ID = "printable-coupon";

type RewardResultModalProps = {
  cat: Cat | null;
  outcome: WheelOutcome | null;
  /** Epoch ms — when the next vote becomes available. */
  nextVoteAt: number | null;
  /** Voter's display name — printed on the coupon when available. */
  voterName?: string;
  /** Voter first name for dialogue interpolation. */
  voterFirstName?: string | null;
  /** Affection level with the voted cat — tunes the dialogue tone. */
  affectionLevel?: AffectionLevel;
  onClose: () => void;
  onShare: (cat: Cat) => void;
  onBackToCats: () => void;
};

/**
 * Result modal shown after the Fortune Wheel settles.
 * Two branches:
 *  - win: shows CouponCard preview, redemption guidance, and PDF/Print actions
 *  - lose: shows positive message + countdown until the next vote
 *
 * The offscreen PrintableCoupon is mounted whenever a winning outcome is
 * available, so html2canvas (PDF) and the print dialog can both find it.
 */
export default function RewardResultModal({
  cat,
  outcome,
  nextVoteAt,
  voterName,
  voterFirstName,
  affectionLevel = 0,
  onClose,
  onShare,
  onBackToCats,
}: RewardResultModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  // Gates the redemption blurb + actions until the envelope reveal completes.
  // For no-win outcomes this stays true (reveal never runs).
  const [revealed, setRevealed] = useState(false);

  // Dialogue from the cat — branches on win vs no-win.
  const dialogue = useMemo(() => {
    if (!cat || !outcome) return "";
    return getCatDialogue({
      cat,
      context: outcome.coupon ? "couponWin" : "noCoupon",
      voterFirstName,
      affectionLevel,
    });
  }, [cat, outcome, voterFirstName, affectionLevel]);

  useEffect(() => {
    if (!cat || !outcome) return;
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
  }, [cat, outcome, onClose]);

  // Reset transient UI flags on outcome change.
  useEffect(() => {
    setDownloading(false);
    setDownloadError(null);
    // No-win outcomes have no envelope to open — show the rest immediately.
    setRevealed(!outcome?.coupon);
  }, [outcome?.coupon?.code, outcome?.coupon]);

  const handleDownload = async () => {
    if (!outcome?.coupon) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadCouponPDF(PRINTABLE_ID, outcome.coupon.code);
    } catch (err) {
      console.error("Coupon PDF generation failed", err);
      setDownloadError("Couldn't generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    printCoupon();
  };

  return (
    <>
      {/* Offscreen printable — mounted whenever we have a coupon so PDF and
          print can both target it. Lives outside the modal subtree so it isn't
          removed during exit animations. */}
      {cat && outcome?.coupon && (
        <PrintableCoupon
          cat={cat}
          coupon={outcome.coupon}
          voterName={voterName}
          id={PRINTABLE_ID}
        />
      )}

      <AnimatePresence>
        {cat && outcome && (
          <motion.div
            key="reward-root"
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-modal="true"
            role="dialog"
            aria-labelledby="reward-title"
          >
            <motion.div
              className="absolute inset-0 bg-brown/45 backdrop-blur-md"
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
              className="relative z-10 w-full rounded-t-[28px] sm:max-w-[520px] sm:rounded-[28px]"
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

                <div className="px-5 pb-6 pt-5 sm:px-7 sm:pb-8 sm:pt-6">
                  {/* Header */}
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-mint-light via-cream to-pink-light shadow-soft sm:h-20 sm:w-20">
                      <Image
                        src={cat.image}
                        alt={cat.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="inline-flex items-center gap-1 rounded-full bg-pink/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-pink-dark">
                        <Sparkles className="h-3 w-3" strokeWidth={2.6} />
                        {outcome.coupon ? "You won a treat" : "Fortune result"}
                      </p>
                      <h2
                        id="reward-title"
                        className="mt-1.5 font-display text-xl font-bold leading-tight text-brown sm:text-2xl"
                      >
                        {outcome.section.emoji} {outcome.section.label}
                      </h2>
                      <p className="mt-1 text-sm text-brown/75">
                        {outcome.message}
                      </p>
                    </div>
                  </div>

                  {/* Body — branches by outcome type */}
                  <div className="mt-5">
                    {outcome.coupon ? (
                      <>
                        <CouponReveal
                          coupon={outcome.coupon}
                          cat={cat}
                          onRevealComplete={() => setRevealed(true)}
                        />

                        {/* Helpful message — fades in after envelope opens */}
                        <AnimatePresence>
                          {revealed && (
                            <motion.div
                              key="redeem-info"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.35, ease: "easeOut" }}
                              className="mt-4 flex items-start gap-2 rounded-2xl border border-pink-dark/25 bg-pink-light/30 px-4 py-3 text-[13px] leading-relaxed text-brown/85"
                            >
                              <Info
                                className="mt-0.5 h-4 w-4 shrink-0 text-pink-dark"
                                strokeWidth={2.4}
                              />
                              <span>
                                Please download or print this coupon and show
                                it to our staff within{" "}
                                <span className="font-semibold">7 days</span>.
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Download error — friendly inline panel with retry */}
                        <AnimatePresence>
                          {downloadError && (
                            <motion.div
                              key="download-error"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              role="alert"
                              className="mt-3 flex items-start gap-2 rounded-2xl border border-pink-dark/30 bg-white/85 px-3.5 py-2.5 text-[12px] leading-relaxed text-brown/85"
                            >
                              <Info
                                className="mt-0.5 h-4 w-4 shrink-0 text-pink-dark"
                                strokeWidth={2.4}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-brown">
                                  PDF didn&apos;t save this time 🐾
                                </p>
                                <p className="mt-0.5 text-brown/65">
                                  No worries — try the print option, or tap
                                  Download again in a moment.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setDownloadError(null)}
                                aria-label="Dismiss error"
                                className="rounded-full p-1 text-brown/40 transition hover:bg-brown/5 hover:text-brown/80"
                              >
                                <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      <NoWinPanel
                        nextVoteAt={nextVoteAt}
                        catName={cat.name}
                      />
                    )}

                    {/* The cat speaks — win and no-win both get a line.
                        For the win branch, gated on the envelope reveal so
                        it fades in alongside the coupon. */}
                    {dialogue && (
                      <AnimatePresence>
                        {(!outcome.coupon || revealed) && (
                          <motion.div
                            key="reward-dialogue"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: 0.35,
                              delay: outcome.coupon ? 0.15 : 0,
                              ease: "easeOut",
                            }}
                            className="mt-3 flex justify-center"
                          >
                            <CatDialogueBubble
                              text={dialogue}
                              variant="compact"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>

                  {/* Actions — gated on reveal completion for the win branch */}
                  {outcome.coupon ? (
                    <AnimatePresence>
                      {revealed && (
                        <motion.div
                          key="win-actions"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                        >
                          <WinActions
                            downloading={downloading}
                            onDownload={handleDownload}
                            onPrint={handlePrint}
                            onShare={() => onShare(cat)}
                            onBackToCats={onBackToCats}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  ) : (
                    <NoWinActions
                      onShare={() => onShare(cat)}
                      onBackToCats={onBackToCats}
                    />
                  )}
                </div>

                <div className="h-2 sm:hidden" aria-hidden="true" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------- Win-branch action stack ----------

function WinActions({
  downloading,
  onDownload,
  onPrint,
  onShare,
  onBackToCats,
}: {
  downloading: boolean;
  onDownload: () => void;
  onPrint: () => void;
  onShare: () => void;
  onBackToCats: () => void;
}) {
  return (
    <div className="mt-5 flex flex-col gap-2">
      {/* Primary — Download PDF */}
      <motion.button
        type="button"
        onClick={onDownload}
        disabled={downloading}
        whileTap={{ scale: downloading ? 1 : 0.97 }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brown px-5 py-3.5 text-sm font-semibold text-cream shadow-soft transition hover:bg-brown-400 hover:shadow-card disabled:cursor-wait disabled:opacity-80"
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
            Preparing PDF...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" strokeWidth={2.4} />
            Download Coupon PDF
          </>
        )}
      </motion.button>

      {/* Secondary row — Print + Share */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-brown/15 bg-white/80 px-3 py-2.5 text-xs font-semibold text-brown transition hover:border-brown/40 hover:bg-white active:scale-[0.98]"
        >
          <Printer className="h-3.5 w-3.5" strokeWidth={2.4} />
          Print Coupon
        </button>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-brown/15 bg-white/80 px-3 py-2.5 text-xs font-semibold text-brown transition hover:border-brown/40 hover:bg-white active:scale-[0.98]"
        >
          <Share2 className="h-3.5 w-3.5" strokeWidth={2.4} />
          Share My Vote
        </button>
      </div>

      {/* Tertiary — Back to Cats */}
      <button
        type="button"
        onClick={onBackToCats}
        className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-brown/70 transition hover:text-brown"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
        Back to Cats
      </button>
    </div>
  );
}

// ---------- No-win actions ----------

function NoWinActions({
  onShare,
  onBackToCats,
}: {
  onShare: () => void;
  onBackToCats: () => void;
}) {
  return (
    <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <motion.button
        type="button"
        onClick={onShare}
        whileTap={{ scale: 0.97 }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brown px-5 py-3 text-sm font-semibold text-cream shadow-soft transition hover:bg-brown-400 hover:shadow-card"
      >
        <Share2 className="h-4 w-4" strokeWidth={2.4} />
        Share My Vote
      </motion.button>
      <button
        type="button"
        onClick={onBackToCats}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-brown/15 bg-white/80 px-5 py-3 text-sm font-semibold text-brown transition hover:border-brown/40 hover:bg-white active:scale-[0.98]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
        Back to Cats
      </button>
    </div>
  );
}

// ---------- No-win body ----------

function NoWinPanel({
  nextVoteAt,
  catName,
}: {
  nextVoteAt: number | null;
  catName: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-brown/10 bg-gradient-to-br from-mint-light/55 via-cream to-pink-light/45 px-5 py-5 text-center shadow-soft">
      <motion.span
        aria-hidden="true"
        className="absolute -left-2 top-4 text-pink/35"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Heart className="h-7 w-7" fill="currentColor" strokeWidth={0} />
      </motion.span>
      <motion.span
        aria-hidden="true"
        className="absolute -right-2 bottom-4 text-mint-dark/40"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      >
        <Heart className="h-6 w-6" fill="currentColor" strokeWidth={0} />
      </motion.span>

      <p className="font-display text-base font-semibold text-brown sm:text-lg">
        Your heart still made the cats happy today.
      </p>
      <p className="mt-1 text-xs text-brown/65">
        {catName} is purring somewhere. Come back tomorrow for another chance.
      </p>

      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-brown/15 bg-white/80 px-4 py-2 shadow-soft backdrop-blur">
        <Clock className="h-3.5 w-3.5 text-pink-dark" strokeWidth={2.4} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-brown/65">
          Next heart in
        </span>
        <span className="font-display text-sm font-bold text-brown">
          {nextVoteAt ? (
            <CountdownTimer target={nextVoteAt} />
          ) : (
            "23h 59m 59s"
          )}
        </span>
      </div>
    </div>
  );
}

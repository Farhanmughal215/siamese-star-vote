"use client";

import { motion } from "framer-motion";
import { Coffee, Heart, Sparkles } from "lucide-react";
import type { Cat, Coupon } from "@/lib/types";

type CouponCardProps = {
  coupon: Coupon;
  cat: Cat;
  className?: string;
};

function formatValidUntil(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Reusable café coupon card. Used inside the result modal and any other
 * surface that needs to display a redeemable reward.
 */
export default function CouponCard({ coupon, cat, className = "" }: CouponCardProps) {
  return (
    <motion.div
      initial={{ scale: 0.94, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className={`relative overflow-hidden rounded-[24px] border border-brown/15 bg-gradient-to-br from-pink-light/55 via-cream to-mint-light/55 shadow-card ${className}`}
    >
      {/* Top notch + brand strip */}
      <div className="flex items-center justify-between border-b border-dashed border-brown/20 bg-white/50 px-4 py-2 backdrop-blur">
        <span className="inline-flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-brown">
          <Coffee className="h-3 w-3 text-pink-dark" strokeWidth={2.6} />
          Siamese Cat Café
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-brown/55">
          Reward
        </span>
      </div>

      {/* Decorative paw watermark */}
      <svg
        aria-hidden="true"
        viewBox="0 0 64 64"
        className="pointer-events-none absolute -right-3 -top-3 h-24 w-24 text-pink/15"
      >
        <g fill="currentColor">
          <ellipse cx="32" cy="42" rx="14" ry="11" />
          <ellipse cx="14" cy="26" rx="6" ry="8" />
          <ellipse cx="50" cy="26" rx="6" ry="8" />
          <ellipse cx="22" cy="12" rx="5" ry="7" />
          <ellipse cx="42" cy="12" rx="5" ry="7" />
        </g>
      </svg>

      <div className="relative px-4 py-4 sm:px-5">
        {/* Title */}
        <p className="inline-flex items-center gap-1 rounded-full bg-pink/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-dark">
          <Sparkles className="h-3 w-3" strokeWidth={2.6} />
          Coupon Won
        </p>
        <h3 className="mt-2 font-display text-xl font-bold leading-tight text-brown sm:text-2xl">
          {coupon.title}
        </h3>
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-brown/60">
          <Heart className="h-3 w-3 text-pink-dark" fill="currentColor" strokeWidth={0} />
          From your vote for{" "}
          <span className="font-semibold text-brown">{cat.name}</span>
        </p>

        {/* Code chip */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-brown/25 bg-white/70 px-4 py-3 backdrop-blur">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brown/55">
              Code
            </p>
            <p className="font-display text-lg font-bold tracking-[0.16em] text-brown">
              {coupon.code}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brown/55">
              Valid until
            </p>
            <p className="text-xs font-semibold text-brown">
              {formatValidUntil(coupon.validUntil)}
            </p>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] text-brown/65">
          {coupon.blurb}
        </p>
      </div>
    </motion.div>
  );
}

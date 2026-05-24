"use client";

import { useState, useTransition } from "react";
import { Check, Gift, Loader2, ScanLine, X } from "lucide-react";
import { redeemCouponByCode } from "./actions";

type Result =
  | { kind: "idle" }
  | { kind: "pending" }
  | {
      kind: "ok";
      reward: string;
      voter: string;
      cat: string;
      code: string;
    }
  | { kind: "err"; message: string };

/**
 * Staff-facing widget: type a coupon code, hit Redeem, see ✓ or ✗ instantly.
 * Intended for the cafe counter — a customer hands over a code and you mark
 * it redeemed in under two seconds.
 */
export default function QuickRedeem() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 3) return;
    setResult({ kind: "pending" });
    startTransition(async () => {
      const res = await redeemCouponByCode(trimmed);
      if (res.ok) {
        setResult({
          kind: "ok",
          reward: res.reward ?? "",
          voter: res.voter ?? "",
          cat: res.cat ?? "",
          code: trimmed,
        });
        setCode("");
      } else {
        setResult({ kind: "err", message: res.error ?? "Could not redeem." });
      }
    });
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-pink-dark/15 bg-gradient-to-br from-cream via-pink-light/10 to-mint-light/20 p-5 shadow-soft">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-mint via-pink to-pink-dark" />
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-pink to-pink-dark text-cream shadow-card">
          <ScanLine className="h-4 w-4" strokeWidth={2.4} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-dark">
            Counter Tool
          </p>
          <h2 className="font-display text-lg font-bold leading-tight text-brown">
            Quick Redeem
          </h2>
        </div>
      </div>
      <p className="text-[12px] text-brown/65">
        Customer at the counter with a coupon? Type the code, hit redeem.
      </p>

      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="MEOW-1234"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 rounded-full border border-brown/15 bg-white px-4 py-2.5 font-display text-base font-bold tracking-[0.1em] text-brown placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-brown/35 focus:border-brown/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending || code.trim().length < 3}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brown px-5 py-2.5 text-sm font-semibold text-cream shadow-soft transition hover:bg-brown-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
          ) : (
            <Gift className="h-4 w-4" strokeWidth={2.4} />
          )}
          Redeem
        </button>
      </form>

      {/* Result panel */}
      {result.kind === "ok" && (
        <div className="mt-3 rounded-2xl border border-mint-dark/30 bg-mint-light/40 px-4 py-3">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint-dark text-cream">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold text-brown">
                Redeemed · {result.reward}
              </p>
              <p className="text-[12px] text-brown/65">
                <span className="font-semibold">{result.voter}</span> ·{" "}
                gift from{" "}
                <span className="font-semibold text-pink-dark">
                  {result.cat}
                </span>{" "}
                ·{" "}
                <code className="rounded bg-brown/8 px-1 py-0.5 text-[11px]">
                  {result.code}
                </code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResult({ kind: "idle" })}
              className="rounded-full p-1 text-brown/45 transition hover:bg-brown/8 hover:text-brown"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
          </div>
        </div>
      )}

      {result.kind === "err" && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-pink-dark/30 bg-pink-light/30 px-4 py-3">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-dark text-cream">
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-brown">
              {result.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setResult({ kind: "idle" })}
            className="rounded-full p-1 text-brown/45 transition hover:bg-brown/8 hover:text-brown"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.4} />
          </button>
        </div>
      )}
    </div>
  );
}

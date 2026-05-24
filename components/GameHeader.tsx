"use client";

import { motion } from "framer-motion";
import { Crown, Heart, Sparkles, Ticket, UserRound } from "lucide-react";
import SoundToggle from "./SoundToggle";
import { playSound } from "@/lib/sound";

type GameHeaderProps = {
  onCtaClick: () => void;
  isAuthed?: boolean;
  userName?: string | null;
};

const stats = [
  { icon: Heart, label: "16 Cats" },
  { icon: Crown, label: "1 Mayor" },
  { icon: Sparkles, label: "Vote Once Daily" },
];

export default function GameHeader({
  onCtaClick,
  isAuthed = false,
  userName = null,
}: GameHeaderProps) {
  const firstName =
    userName && userName.trim().length > 0
      ? userName.trim().split(/\s+/)[0]
      : null;
  return (
    <header className="sticky top-0 z-40 border-b border-brown/10 bg-cream/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-6">
        {/* Logo + title block */}
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink to-pink-dark shadow-card"
          >
            <Crown className="h-5 w-5 text-cream" strokeWidth={2.4} />
            {/* Tiny mint corner dot */}
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-mint shadow-soft" />
          </motion.div>

          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold leading-tight text-brown sm:text-xl">
              Siamese Star Vote
            </h1>
            <p className="truncate text-[11px] italic text-brown/65 sm:text-xs">
              The Cat Mayor Election of Siamese Cat Café
            </p>
          </div>
        </div>

        {/* Stats + CTA row (stays inline on >=md; on mobile, stats wrap to row below) */}
        <div className="flex items-center justify-between gap-3 md:justify-end">
          {/* Stat chips — scroll horizontally on tiny screens */}
          <ul className="scrollbar-none flex max-w-[60%] items-center gap-1.5 overflow-x-auto md:max-w-none md:gap-2">
            {stats.map((s) => (
              <li
                key={s.label}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brown/10 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-brown shadow-sm backdrop-blur"
              >
                <s.icon className="h-3 w-3 text-pink-dark" strokeWidth={2.5} />
                <span>{s.label}</span>
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 items-center gap-2">
            <SoundToggle />
            <motion.button
              type="button"
              onClick={() => {
                playSound("pawTap");
                onCtaClick();
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              aria-label={isAuthed ? "View your profile" : "Sign in to vote"}
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brown px-4 py-2 text-xs font-semibold text-cream shadow-soft transition-shadow hover:shadow-card sm:text-sm"
            >
              {isAuthed ? (
                <>
                  <UserRound
                    className="h-3.5 w-3.5 text-pink-light"
                    strokeWidth={2.4}
                  />
                  <span>My Profile</span>
                  {firstName && (
                    <>
                      <span className="hidden text-pink-light sm:inline">·</span>
                      <span className="hidden max-w-[8rem] truncate sm:inline">
                        {firstName}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Ticket
                    className="h-3.5 w-3.5 text-pink-light"
                    strokeWidth={2.4}
                  />
                  <span>Sign In</span>
                  <span className="hidden text-pink-light sm:inline">·</span>
                  <span className="hidden sm:inline">Start Voting</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  );
}

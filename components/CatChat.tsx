"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import type { Cat } from "@/lib/types";

type Role = "user" | "assistant";
type Msg = { role: Role; content: string };

const MAX_USER_MESSAGES = 4;

export default function CatChat({
  cat,
  onClose,
}: {
  cat: Cat | null;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset state and seed a friendly greeting whenever we open for a new cat.
  useEffect(() => {
    if (!cat) return;
    setMessages([
      {
        role: "assistant",
        content: `*${cat.name} pads over and slow-blinks at you* Hi, friend! What would you like to chat about? 🐾`,
      },
    ]);
    setDraft("");
    setPending(false);
    setExhausted(false);
    const t = window.setTimeout(() => inputRef.current?.focus(), 200);
    return () => window.clearTimeout(t);
  }, [cat]);

  // Auto-scroll to the latest message.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  // Scroll lock + Escape.
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

  const userMsgCount = messages.filter((m) => m.role === "user").length;
  const remaining = Math.max(0, MAX_USER_MESSAGES - userMsgCount);

  async function send(content: string) {
    if (!cat || !content.trim() || pending || exhausted) return;
    const userMsg: Msg = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setDraft("");
    setPending(true);

    try {
      const res = await fetch("/api/cat-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cat: {
            name: cat.name,
            title: cat.title,
            personality: cat.personality,
            description: cat.description,
            quote: cat.quote,
            favoriteThings: cat.favoriteThings,
          },
          // Only pass user/assistant turns, not the initial greeting (it's
          // already implied by the system prompt). Send recent context.
          messages: newMessages.filter((_, i) => i !== 0),
        }),
      });
      const data = (await res.json()) as {
        reply: string;
        exhausted?: boolean;
      };
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? "*purrs softly*" },
      ]);
      if (data.exhausted) setExhausted(true);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "*flicks tail* Something startled me. Try saying that again in a moment?",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  // After the response to the last allowed message, mark exhausted so the
  // input disables and the goodbye banner shows.
  useEffect(() => {
    if (userMsgCount >= MAX_USER_MESSAGES && !pending) {
      setExhausted(true);
    }
  }, [userMsgCount, pending]);

  return (
    <AnimatePresence>
      {cat && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-brown/45 px-4 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/40 bg-cream/55 backdrop-blur-2xl backdrop-saturate-150"
            style={{
              boxShadow:
                "0 40px 90px -28px rgba(90,49,20,0.55), inset 0 1px 0 rgba(255,255,255,0.7), 0 0 0 1px rgba(255,255,255,0.25)",
            }}
          >
            {/* Background wash — soft kawaii radial blobs that bleed behind
                the glass for color depth */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                backgroundImage:
                  "radial-gradient(420px 280px at 0% 0%, rgba(231,158,174,0.45), transparent 65%), radial-gradient(420px 280px at 100% 0%, rgba(187,221,211,0.45), transparent 65%), radial-gradient(420px 320px at 50% 110%, rgba(231,158,174,0.30), transparent 65%)",
              }}
            />
            {/* Subtle inner sheen line at the top */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent"
            />
            {/* Brand-accent stripe */}
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-mint via-pink to-pink-dark" />

            {/* Header */}
            <div className="relative flex items-center gap-3 border-b border-white/30 bg-white/35 px-4 py-3 backdrop-blur-md sm:px-5">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-10 w-10 shrink-0 rounded-2xl object-cover ring-2 ring-white/60"
                />
                {/* Pulse dot — "the cat is here, listening" */}
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 -right-0.5 inline-flex h-3 w-3"
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint-dark opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-mint-dark ring-2 ring-white" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-pink-dark">
                  <Sparkles className="h-3 w-3" strokeWidth={2.6} />
                  Chat with the cat
                </p>
                <h2 className="truncate font-display text-base font-bold leading-tight text-brown">
                  {cat.name}
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close chat"
                className="rounded-full bg-white/50 p-1.5 text-brown/65 transition hover:bg-white/80 hover:text-brown"
              >
                <X className="h-4 w-4" strokeWidth={2.4} />
              </button>
            </div>

            {/* Message log */}
            <div
              ref={scrollerRef}
              className="relative max-h-[55vh] min-h-[280px] overflow-y-auto px-4 py-4 sm:px-5"
            >
              <ul className="space-y-2.5">
                {messages.map((m, i) => (
                  <li key={i} className="flex">
                    {m.role === "assistant" ? (
                      <CatBubble text={m.content} />
                    ) : (
                      <UserBubble text={m.content} />
                    )}
                  </li>
                ))}
                {pending && (
                  <li className="flex">
                    <CatBubble typing />
                  </li>
                )}
              </ul>
            </div>

            {/* Composer */}
            <div className="relative border-t border-white/30 bg-white/40 px-4 py-3 backdrop-blur-md sm:px-5">
              {exhausted ? (
                <p className="text-center text-[12px] italic text-brown/70">
                  🌙 Naptime! Come back tomorrow to chat with {cat.name} again.
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(draft);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Say hi to ${cat.name}…`}
                    maxLength={400}
                    disabled={pending}
                    className="w-full rounded-full border border-white/60 bg-white/75 px-4 py-2 text-sm text-brown placeholder:text-brown/40 shadow-inner backdrop-blur-sm focus:border-pink-dark/40 focus:bg-white focus:outline-none disabled:cursor-wait disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={pending || draft.trim().length === 0}
                    aria-label="Send"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brown to-brown-400 text-cream shadow-card transition hover:from-brown-400 hover:to-brown-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" strokeWidth={2.4} />
                  </button>
                </form>
              )}
              <p className="mt-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-brown/55">
                <MessageCircle className="mr-1 inline h-3 w-3" />
                {remaining} {remaining === 1 ? "message" : "messages"} left
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CatBubble({ text, typing }: { text?: string; typing?: boolean }) {
  return (
    <div
      className="relative max-w-[80%] rounded-2xl rounded-tl-sm border border-white/50 bg-gradient-to-br from-white/85 via-pink-light/40 to-pink-light/55 px-3.5 py-2 text-[14px] leading-snug text-brown backdrop-blur-md"
      style={{
        boxShadow:
          "0 6px 18px -8px rgba(213, 122, 142, 0.35), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}
    >
      {typing ? (
        <span className="inline-flex items-center gap-1 py-0.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-dark [animation-delay:-200ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-dark [animation-delay:-100ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-dark" />
        </span>
      ) : (
        text
      )}
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div
      className="relative ml-auto max-w-[80%] rounded-2xl rounded-tr-sm border border-brown/40 bg-gradient-to-br from-brown to-brown-400 px-3.5 py-2 text-[14px] leading-snug text-cream"
      style={{
        boxShadow:
          "0 8px 22px -10px rgba(90,49,20,0.55), inset 0 1px 0 rgba(255,255,255,0.18)",
      }}
    >
      {text}
    </div>
  );
}

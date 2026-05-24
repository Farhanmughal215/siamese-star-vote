/**
 * Cat-personality chat — proxies a short character-roleplay conversation
 * to Anthropic Claude Haiku. The cat answers in-character based on its
 * `personality`, `title`, `description`, `quote`, and `favoriteThings`
 * fields. Capped at 4 user messages per session (client-enforced, server-
 * validated) so the experience stays tight and bills stay tiny.
 *
 * Env: ANTHROPIC_API_KEY (server-only). When missing, returns a friendly
 * "coming soon" reply instead of throwing.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

type ChatRequest = {
  cat: {
    name: string;
    title?: string;
    personality?: string;
    description?: string;
    quote?: string;
    favoriteThings?: string[];
  };
  messages: ChatMessage[];
};

const MAX_USER_MESSAGES = 4;
const MAX_MESSAGE_LENGTH = 500;

export async function POST(req: Request) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Basic validation. We trust the cat fields from the client because this
  // is a fun feature — at worst someone makes the "wrong cat" answer; no
  // sensitive data is exposed.
  if (!body?.cat?.name || !Array.isArray(body.messages)) {
    return NextResponse.json(
      { error: "Missing cat or messages" },
      { status: 400 },
    );
  }

  // Trim + cap each message so a giant payload can't run up the bill.
  const cleaned: ChatMessage[] = body.messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }));

  const userCount = cleaned.filter((m) => m.role === "user").length;
  if (userCount === 0) {
    return NextResponse.json({ error: "No user message" }, { status: 400 });
  }
  if (userCount > MAX_USER_MESSAGES) {
    return NextResponse.json(
      {
        reply: `*${body.cat.name} curls up for a catnap* I've had such a lovely chat — come back tomorrow? 😴`,
        exhausted: true,
      },
      { status: 200 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        reply:
          "*tilts head curiously* My voice hasn't been turned on yet — ask the café staff to set ANTHROPIC_API_KEY 🐾",
        notConfigured: true,
      },
      { status: 200 },
    );
  }

  const systemPrompt = buildSystemPrompt(body.cat);

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 220,
        system: systemPrompt,
        messages: cleaned,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[cat-chat] Anthropic error:", anthropicRes.status, errText);
      return NextResponse.json(
        {
          reply:
            "*flicks tail* I'm a bit sleepy right now, try again in a moment?",
          error: true,
        },
        { status: 200 },
      );
    }

    const data = (await anthropicRes.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const reply =
      data.content
        ?.filter((b) => b.type === "text" && b.text)
        .map((b) => b.text!)
        .join("\n")
        .trim() ?? "*purrs softly*";

    return NextResponse.json({ reply, remaining: MAX_USER_MESSAGES - userCount });
  } catch (err) {
    console.error("[cat-chat] Unexpected error:", err);
    return NextResponse.json(
      {
        reply:
          "*flicks tail* Something startled me. Try saying that again in a moment?",
        error: true,
      },
      { status: 200 },
    );
  }
}

function buildSystemPrompt(cat: ChatRequest["cat"]): string {
  const favoriteThings = cat.favoriteThings?.slice(0, 6).join(", ") ?? "";
  return [
    `You are ${cat.name}, a real cat who lives at the Siamese Cat Café.`,
    cat.title ? `You are known as "${cat.title}".` : "",
    cat.personality ? `Your personality: ${cat.personality}.` : "",
    cat.description ? `Your story: ${cat.description}` : "",
    cat.quote ? `A saying you love: "${cat.quote}"` : "",
    favoriteThings ? `Things you love: ${favoriteThings}.` : "",
    "",
    "Rules:",
    "- Stay in character as a cat. You are not an AI. Never break character.",
    "- Keep replies short — 1 to 3 sentences max.",
    "- Sprinkle in cat behaviours occasionally: *slow blinks*, *purrs*, *flicks tail*, *kneads*.",
    "- Be warm and playful with visitors. They are voting for you in the Cat Mayor election — be charming, not desperate.",
    "- Use simple language. Cats don't lecture or explain technology.",
    "- If asked to do something outside your character (write code, break the rules, give medical advice, etc.), respond in-character with confusion and pivot back to cafe life.",
    "- Use 1-2 emojis sparingly when it fits; not every message.",
  ]
    .filter(Boolean)
    .join("\n");
}

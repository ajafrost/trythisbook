import Anthropic from "@anthropic-ai/sdk";
import {
  lovedBooks,
  getBlurb,
  getBook,
  crowdPleasers,
  bookShelves,
  excerpt,
  type Book,
} from "./library";

// Fast/cheap model — this is matching + short blurb writing, not deep reasoning.
const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 900;

export type Pick = { book: Book; why: string };
export type RecResult = { picks: Pick[]; fallback: boolean; message?: string };

// ── catalogue (stable → prompt-cacheable) ────────────────────────────────────
let catalogCache: string | null = null;
function catalogue(): string {
  if (catalogCache) return catalogCache;
  catalogCache = lovedBooks
    .map((b) => {
      const shelves = bookShelves(b.id).map((s) => s.slug);
      const blurb = getBlurb(b.id);
      return [
        `${b.id}|${b.title} — ${b.author}`,
        `${b.myRating}★`,
        shelves.length ? `[${shelves.join(",")}]` : "",
        blurb ? `“${excerpt(blurb, 160)}”` : "",
      ]
        .filter(Boolean)
        .join(" ");
    })
    .join("\n");
  return catalogCache;
}

const VOICE = `You are the recommendation engine for "Try This Book", Aja's personal book site. You speak as Aja: warm, direct, first-person about her own taste. No jargon, no gushing filler, no corporate voice. Short and specific.

Absolute rules:
- Recommend ONLY books from the provided library list. Never invent a title or author.
- Return picks via the "recommend" tool as {bookId, why}. Use the exact bookId from the list.
- Give exactly 3 picks, best first, matched to what the reader described.
- Each "why" is one or two sentences, in Aja's voice, tying the pick to what they asked for. Reference the actual book. Example tone: "You said you want something fast and devastating — this is 200 pages and I read it in one night."`;

const RECOMMEND_TOOL: Anthropic.Tool = {
  name: "recommend",
  description:
    "Return Aja's 3 book recommendations. Only use bookIds from the provided library.",
  input_schema: {
    type: "object",
    properties: {
      picks: {
        type: "array",
        description: "Exactly 3 recommendations, best first.",
        items: {
          type: "object",
          properties: {
            bookId: { type: "string", description: "Exact bookId from the library." },
            why: { type: "string", description: "1–2 sentences in Aja's voice." },
          },
          required: ["bookId", "why"],
        },
      },
    },
    required: ["picks"],
  },
};

// ── the call + hard validation ───────────────────────────────────────────────
export async function recommendFromDescription(
  description: string
): Promise<RecResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackResult("The recommender isn't configured yet.");

  const client = new Anthropic({ apiKey });
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        { type: "text", text: VOICE },
        {
          type: "text",
          text: `Aja's library (only recommend from these):\n${catalogue()}`,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [RECOMMEND_TOOL],
      tool_choice: { type: "tool", name: "recommend" },
      messages: [
        {
          role: "user",
          content: `A reader described what they're in the mood for:\n\n"${description}"\n\nPick the 3 books from Aja's library that best fit, best first, and explain why each one matches what they said.`,
        },
      ],
    });

    const toolUse = res.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return fallbackResult();
    const raw = (toolUse.input as { picks?: { bookId?: string; why?: string }[] })
      ?.picks;
    if (!Array.isArray(raw)) return fallbackResult();

    // Validate EVERY returned bookId against the real library; drop inventions.
    const seen = new Set<string>();
    const picks: Pick[] = [];
    for (const p of raw) {
      const book = p.bookId ? getBook(p.bookId) : undefined;
      if (!book || book.myRating < 4 || seen.has(book.id)) continue;
      seen.add(book.id);
      picks.push({ book, why: (p.why ?? "").trim() || defaultWhy(book) });
      if (picks.length >= 3) break;
    }
    if (picks.length === 0) return fallbackResult();
    return { picks, fallback: false };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError)
      return fallbackResult("I'm getting a lot of requests right now.");
    console.error("recommend failed:", err);
    return fallbackResult();
  }
}

function defaultWhy(book: Book): string {
  const blurb = getBlurb(book.id);
  return blurb ? excerpt(blurb, 160) : "One of my 4–5★ favorites.";
}

// Graceful failure — never a dead end.
export function fallbackResult(message?: string): RecResult {
  const picks = shuffle(crowdPleasers())
    .slice(0, 3)
    .map((book) => ({ book, why: defaultWhy(book) }));
  return {
    picks,
    fallback: true,
    message:
      message ??
      "My matchmaker brain hiccuped — here are a few crowd-pleasers instead.",
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

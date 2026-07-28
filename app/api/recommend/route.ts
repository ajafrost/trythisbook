import { NextRequest, NextResponse } from "next/server";
import {
  recommendFromDescription,
  fallbackResult,
  type RecResult,
} from "@/lib/recommend";
import { getBlurb, bookSlug } from "@/lib/library";

export const runtime = "nodejs";

// tiny in-memory rate limiter + cache (friends-scale traffic)
const RATE_LIMIT = 10; // recs per hour per IP
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();
const cache = new Map<string, { at: number; body: unknown }>();
const CACHE_TTL = 10 * 60 * 1000;

function ipOf(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function serialize(result: RecResult) {
  return {
    fallback: result.fallback,
    message: result.message,
    picks: result.picks.map(({ book, why }) => ({
      id: book.id,
      slug: bookSlug(book.id),
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      goodreadsUrl: book.goodreadsUrl,
      myRating: book.myRating,
      blurb: getBlurb(book.id),
      why,
    })),
  };
}

export async function POST(req: NextRequest) {
  let description = "";
  try {
    const body = (await req.json()) as { description?: string };
    description = (body.description ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ error: "Describe what you want" }, { status: 400 });
  }
  if (description.length > 500) description = description.slice(0, 500);

  const key = description.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return NextResponse.json(cached.body);
  }

  if (rateLimited(ipOf(req))) {
    return NextResponse.json(
      serialize(
        fallbackResult(
          "You've hit the request limit for now (keeps this from becoming a bill!). Here are a few of my crowd-pleasers."
        )
      )
    );
  }

  const result = await recommendFromDescription(description);
  const payload = serialize(result);
  cache.set(key, { at: Date.now(), body: payload });
  return NextResponse.json(payload);
}

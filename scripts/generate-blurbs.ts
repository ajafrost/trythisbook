/**
 * generate-blurbs.ts — draft a short blurb for any loved book that has neither
 * a curated blurb nor a Goodreads review to fall back on. Runs after the sync
 * (see .github/workflows/goodreads-sync.yml) so new books don't ship blank.
 *
 * For each such book: look up a real description (Google Books, then Open
 * Library) to ground the model, ask Claude (Haiku) for a 1–2 sentence blurb in
 * Aja's voice, and write it to curation.blurbs flagged needsReview for her edit
 * pass. If no description is found AND the model isn't confident about the book,
 * it replies SKIP and the book is left blank rather than risk invented plot.
 *
 * Needs ANTHROPIC_API_KEY (from the environment, or .env.local when run locally).
 * Re-runnable; never overwrites an existing blurb.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import type { Book, Curation } from "../lib/library";

const ROOT = process.cwd();
const LIB = join(ROOT, "data", "library.json");
const CUR = join(ROOT, "data", "curation.json");
const MODEL = "claude-haiku-4-5";
const UA = "trythisbook/1.0 (blurb drafts; aja.t.frost@gmail.com)";

// Load ANTHROPIC_API_KEY from .env.local when running locally (CI sets it via env).
function loadEnvLocal() {
  if (process.env.ANTHROPIC_API_KEY) return;
  const p = join(ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchDescription(b: Book): Promise<string | undefined> {
  // Google Books — good coverage of new/mainstream titles. Anonymous requests
  // are rate-limited (429), so back off and retry a couple of times.
  const q = encodeURIComponent(`intitle:${b.title} inauthor:${b.author.trim()}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&country=US`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA } });
      if (res.status === 429 || res.status >= 500) {
        await sleep(2500 * (attempt + 1));
        continue;
      }
      if (res.ok) {
        const j = (await res.json()) as {
          items?: { volumeInfo?: { description?: string } }[];
        };
        const d = j.items?.[0]?.volumeInfo?.description;
        if (d && d.trim().length > 40) return d.trim();
      }
      break;
    } catch {
      await sleep(800);
    }
  }
  // Open Library work description as a fallback.
  try {
    if (!b.isbn13) return undefined;
    const r = await fetch(`https://openlibrary.org/isbn/${b.isbn13}.json`, {
      headers: { "user-agent": UA },
    });
    if (!r.ok) return undefined;
    const ed = (await r.json()) as { works?: { key: string }[] };
    const wk = ed.works?.[0]?.key;
    if (!wk) return undefined;
    const wr = await fetch(`https://openlibrary.org${wk}.json`, {
      headers: { "user-agent": UA },
    });
    if (!wr.ok) return undefined;
    const w = (await wr.json()) as { description?: string | { value: string } };
    const d = typeof w.description === "string" ? w.description : w.description?.value;
    if (d && d.trim().length > 40) return d.trim();
  } catch {
    /* ignore */
  }
  return undefined;
}

const SYSTEM = `You write ultra-short book blurbs in the voice of Aja Frost — warm, plain-spoken, specific, no jargon or marketing hype. Format: one vivid sentence describing what the book is, then a short honest take. ~15–30 words total. No spoilers. Only use plot details supported by the description or that you're genuinely confident about — never invent specifics. If you don't have a real description and aren't confident about THIS exact book, reply with exactly: SKIP. Output only the blurb text, nothing else.`;

async function draftBlurb(
  client: Anthropic,
  b: Book,
  desc: string | undefined
): Promise<string | null> {
  const user = desc
    ? `Book: ${b.title} by ${b.author}\nDescription: ${desc.slice(0, 900)}\n\nWrite the blurb.`
    : `Book: ${b.title} by ${b.author}\n(No description was found — use only what you genuinely know about this specific book, or reply SKIP.)\n\nWrite the blurb.`;
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 120,
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
  });
  const text = res.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();
  if (!text || /^skip$/i.test(text)) return null;
  return text.replace(/^["']|["']$/g, "");
}

async function main() {
  loadEnvLocal();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("✗ ANTHROPIC_API_KEY not set — skipping blurb generation.");
    return; // soft-exit so the sync workflow still commits books/covers
  }
  const lib = JSON.parse(readFileSync(LIB, "utf8")) as Book[];
  const cur = JSON.parse(readFileSync(CUR, "utf8")) as Curation;
  cur.blurbs ??= {};

  const targets = lib.filter(
    (b) =>
      b.myRating >= 4 &&
      !cur.blurbs[b.id]?.text &&
      !b.myReview?.trim()
  );
  console.log(`Books needing a blurb: ${targets.length}`);
  if (targets.length === 0) return;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let wrote = 0;
  for (const b of targets) {
    const desc = await fetchDescription(b);
    try {
      const blurb = await draftBlurb(client, b, desc);
      if (blurb) {
        cur.blurbs[b.id] = { text: blurb, needsReview: true };
        wrote++;
        console.log(`  ✓ ${b.title} — ${b.author}\n      ${blurb}`);
      } else {
        console.log(`  – skipped (not confident): ${b.title}`);
      }
    } catch (e) {
      console.log(`  ! failed ${b.title}: ${(e as Error).message}`);
    }
  }

  if (wrote > 0) {
    writeFileSync(CUR, JSON.stringify(cur, null, 2) + "\n");
  }
  console.log(`\n✓ Wrote ${wrote} draft blurb(s) (flagged needsReview).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

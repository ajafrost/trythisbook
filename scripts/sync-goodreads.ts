/**
 * sync-goodreads.ts — daily incremental sync of newly-loved books.
 *
 * Checks Aja's Goodreads "read" shelf RSS feed for books she's rated 4 or 5
 * stars that aren't in data/library.json yet, and ADDS them. Designed to run
 * unattended on a schedule (see .github/workflows/goodreads-sync.yml).
 *
 * Why a dedicated script instead of `npm run data`:
 *   • `npm run data` also runs build-curation.ts, which RESETS Aja's hand-picked
 *     shelves back to the starter — we must never clobber that on a cron.
 *   • build-library.ts rebuilds from the STATIC goodreads_export.csv plus the
 *     ~100-item RSS window, so any book that ages past that window would silently
 *     disappear. This sync is purely ADDITIVE: it reads the existing library,
 *     appends genuinely new 4–5★ books, and never removes or rewrites anything
 *     else. Running it a thousand times is a no-op once nothing new is loved.
 *
 * Output: rewrites data/library.json only when new books were added, and prints
 * a summary. Exit code is always 0 on success (the workflow decides whether to
 * commit by diffing the file); it exits non-zero only on a real error when
 * ALLOW_EMPTY isn't the issue (e.g. no RSS URL configured).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Book } from "../lib/library";

const ROOT = process.cwd();
const LIB_PATH = join(ROOT, "data", "library.json");
const REMOVED_PATH = join(ROOT, "data", "removed.json");
const UA = "trythisbook/1.0 (personal book site; contact aja.t.frost@gmail.com)";

// ── tiny helpers ──────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// Pull a single tag's text out of an <item> block (handles CDATA), matching the
// parser build-library.ts already uses against this same feed.
function tag(block: string, name: string): string | undefined {
  const m = block.match(
    new RegExp(`<${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`, "i")
  );
  return m ? m[1].trim() : undefined;
}

function cleanIsbn(raw?: string): string | undefined {
  if (!raw) return undefined;
  const v = raw.replace(/^="?/, "").replace(/"?$/, "").trim();
  return v && /^\d{9,13}[\dX]?$/.test(v) ? v : undefined;
}

// Goodreads RSS user_read_at looks like "Wed, 23 Jul 2026 00:00:00 -0700".
function isoDateRead(raw?: string): string | undefined {
  if (!raw) return undefined;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return undefined;
  return new Date(t).toISOString().slice(0, 10);
}

function intOrUndef(raw?: string): number | undefined {
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// ── Open Library cover lookup (same approach as scripts/fetch-covers.ts) ───────
async function olSearch(params: string): Promise<number | undefined> {
  const url = `https://openlibrary.org/search.json?${params}&fields=cover_i&limit=1`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA } });
      if (res.status === 429 || res.status >= 500) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      if (!res.ok) return undefined;
      const json = (await res.json()) as { docs?: { cover_i?: number }[] };
      return json.docs?.[0]?.cover_i;
    } catch {
      await sleep(800);
    }
  }
  return undefined;
}

async function resolveCover(b: Book): Promise<string | undefined> {
  let coverId: number | undefined;
  if (b.isbn13) coverId = await olSearch(`isbn=${encodeURIComponent(b.isbn13)}`);
  if (!coverId) {
    coverId = await olSearch(
      `title=${encodeURIComponent(b.title)}&author=${encodeURIComponent(b.author)}`
    );
  }
  if (coverId) return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
  return b.coverUrl; // fall back to the Goodreads image already on the record
}

// ── RSS → parsed books (ALL ratings; caller filters to 4–5★) ──────────────────
// Returns every readable <item> so the caller can report the feed's rating
// spread — a 4–5★-only filter here would hide whether ratings are being parsed
// at all (vs. the feed simply having no loved books in its recent window).
function parseFeed(xml: string): Book[] {
  const out: Book[] = [];
  const items = xml.split(/<item>/i).slice(1);
  for (const raw of items) {
    const block = raw.split(/<\/item>/i)[0];
    const id = tag(block, "book_id");
    if (!id) continue;
    const rating = Math.round(Number(tag(block, "user_rating") ?? "0"));

    const title = (tag(block, "title") ?? "").trim();
    if (!title) continue;
    const author = (tag(block, "author_name") ?? "").trim();
    const isbn13 = cleanIsbn(tag(block, "isbn13") ?? tag(block, "isbn"));
    const review = tag(block, "user_review");
    const cover =
      tag(block, "book_large_image_url") ?? tag(block, "book_image_url");

    const book: Book = {
      id,
      title,
      author,
      myRating: rating,
      ...(review ? { myReview: stripHtml(review) } : {}),
      shelves: [],
      ...(isoDateRead(tag(block, "user_read_at"))
        ? { dateRead: isoDateRead(tag(block, "user_read_at")) }
        : {}),
      ...(intOrUndef(tag(block, "num_pages"))
        ? { pages: intOrUndef(tag(block, "num_pages")) }
        : {}),
      ...(intOrUndef(tag(block, "book_published"))
        ? { yearPublished: intOrUndef(tag(block, "book_published")) }
        : {}),
      ...(isbn13 ? { isbn13 } : {}),
      ...(cover ? { coverUrl: cover } : {}),
      goodreadsUrl: `https://www.goodreads.com/book/show/${id}`,
    };
    out.push(book);
  }
  return out;
}

function loadRemoved(): { ids: Set<string>; authors: string[] } {
  if (!existsSync(REMOVED_PATH)) return { ids: new Set(), authors: [] };
  try {
    const rm = JSON.parse(readFileSync(REMOVED_PATH, "utf8")) as {
      ids?: string[];
      authors?: string[];
    };
    return {
      ids: new Set(rm.ids ?? []),
      authors: (rm.authors ?? []).map((a) => a.toLowerCase()),
    };
  } catch {
    return { ids: new Set(), authors: [] };
  }
}

async function main() {
  const url = process.env.GOODREADS_RSS_URL;
  if (!url) {
    console.error(
      "✗ GOODREADS_RSS_URL is not set — nothing to sync.\n" +
        "  Set it to Aja's 'read' shelf RSS feed (see .env.example)."
    );
    process.exit(1);
  }
  if (!existsSync(LIB_PATH)) {
    console.error(`✗ ${LIB_PATH} missing — run \`npm run data\` first.`);
    process.exit(1);
  }

  const library = JSON.parse(readFileSync(LIB_PATH, "utf8")) as Book[];
  const known = new Set(library.map((b) => b.id));
  const removed = loadRemoved();

  console.log(`Library has ${library.length} book(s). Fetching RSS…`);
  let xml: string;
  try {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    xml = await res.text();
  } catch (e) {
    console.error(`✗ RSS fetch failed (${e}). Leaving library.json untouched.`);
    process.exit(1);
  }

  const isRemoved = (b: Book) =>
    removed.ids.has(b.id) ||
    removed.authors.some((a) => b.author.toLowerCase().includes(a));

  const parsed = parseFeed(xml);

  // Diagnostic: how big is the feed and what's its rating spread? This makes a
  // "nothing to add" result self-explanatory — 0 loved books in the window vs.
  // ratings not being read at all look identical without it.
  const spread = [0, 1, 2, 3, 4, 5]
    .map((s) => `${s === 0 ? "unrated" : `${s}★`}:${parsed.filter((b) => b.myRating === s).length}`)
    .join("  ");
  console.log(`Feed: ${parsed.length} item(s) parsed · ${spread}`);

  const candidates = parsed.filter((b) => b.myRating >= 4);
  const fresh = candidates.filter((b) => !known.has(b.id) && !isRemoved(b));

  console.log(
    `RSS: ${candidates.length} book(s) rated 4–5★ in the feed · ${fresh.length} new to the site.`
  );

  if (fresh.length === 0) {
    console.log("Nothing new. Library unchanged.");
    return;
  }

  // Resolve a real cover for each new book (best-effort).
  for (const b of fresh) {
    b.coverUrl = await resolveCover(b);
    console.log(
      `  + ${b.myRating}★  ${b.title} — ${b.author}${b.coverUrl ? "" : "  (no cover)"}`
    );
    await sleep(300);
  }

  // Append and re-sort newest-read first, matching build-library.ts.
  const merged = [...library, ...fresh];
  merged.sort((a, b) => (b.dateRead ?? "").localeCompare(a.dateRead ?? ""));
  writeFileSync(LIB_PATH, JSON.stringify(merged, null, 2) + "\n");

  console.log(
    `\n✓ Added ${fresh.length} new book(s) to ${LIB_PATH} (now ${merged.length}).`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

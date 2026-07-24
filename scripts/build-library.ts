/**
 * build-library.ts — CSV (+ optional RSS) → data/library.json
 *
 * Spec 1.2: parse the Goodreads export, filter to the "read" shelf, shape each
 * record, derive a cover URL, and write a single data/library.json the whole
 * site reads from. Lower-rated books are KEPT (useful "read but didn't love"
 * signal for the AI); only the site's display/rec layers filter to 4–5★.
 *
 * RSS merge (spec 1.2 step 3) is implemented in lib/rss.ts and wired into
 * app/api/sync; at plain build time we work from the CSV, which covers the
 * full back catalogue.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Book } from "../lib/library";

const ROOT = join(process.cwd());
const CSV_PATH = join(ROOT, "goodreads_export.csv");
const OUT_PATH = join(ROOT, "data", "library.json");

// ── Minimal RFC-4180-ish CSV parser (handles quotes, escaped "", newlines) ────
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // strip a UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // ignore; handled by \n
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Goodreads wraps ISBNs as ="9780...". Strip the Excel formula armour.
function cleanIsbn(raw: string): string | undefined {
  const v = raw.replace(/^="?/, "").replace(/"?$/, "").trim();
  return v && /^\d{9,13}[\dX]?$/.test(v) ? v : undefined;
}

function num(raw: string): number | undefined {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : undefined;
}

function isoDate(raw: string): string | undefined {
  // Goodreads dates look like 2026/07/23
  const m = raw.trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return undefined;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

function coverUrl(isbn13?: string): string | undefined {
  // Open Library covers API — free, no key. default=false → 404s when missing
  // so the client swaps in a pastel typographic placeholder (spec 3.3).
  if (!isbn13) return undefined;
  return `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg?default=false`;
}

// ── Goodreads RSS merge (spec 1.2 step 3) ────────────────────────────────────
// The CSV covers the back catalogue; the "read" shelf RSS feed carries the ~100
// most recent items for incremental updates. Runs at build time when
// GOODREADS_RSS_URL is set; skips gracefully (never fatal) if it's missing or
// the fetch fails, so a build is never blocked by Goodreads being down.
function tag(block: string, name: string): string | undefined {
  const m = block.match(
    new RegExp(`<${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`, "i")
  );
  return m ? m[1].trim() : undefined;
}

async function fetchRssBooks(): Promise<Map<string, Partial<Book> & { id: string }>> {
  const out = new Map<string, Partial<Book> & { id: string }>();
  const url = process.env.GOODREADS_RSS_URL;
  if (!url) {
    console.log("  (no GOODREADS_RSS_URL set — skipping RSS merge)");
    return out;
  }
  try {
    const res = await fetch(url, { headers: { "user-agent": "trythisbook" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const items = xml.split(/<item>/i).slice(1);
    for (const item of items) {
      const block = item.split(/<\/item>/i)[0];
      const id = tag(block, "book_id");
      if (!id) continue;
      const rating = Math.round(Number(tag(block, "user_rating") ?? "0"));
      const isbn = tag(block, "isbn13");
      out.set(id, {
        id,
        title: (tag(block, "title") ?? "").trim(),
        author: (tag(block, "author_name") ?? "").trim(),
        myRating: rating,
        ...(tag(block, "book_large_image_url") || tag(block, "book_image_url")
          ? {
              coverUrl:
                tag(block, "book_large_image_url") ?? tag(block, "book_image_url"),
            }
          : {}),
        ...(tag(block, "user_review")
          ? { myReview: stripHtml(tag(block, "user_review")!) }
          : {}),
        goodreadsUrl: `https://www.goodreads.com/book/show/${id}`,
      });
    }
    console.log(`  Merged ${out.size} item(s) from RSS feed`);
  } catch (e) {
    console.warn(`  ⚠ RSS fetch failed (${e}) — using CSV only`);
  }
  return out;
}

async function main() {
  if (!existsSync(CSV_PATH)) {
    console.error(`✗ CSV not found at ${CSV_PATH}`);
    process.exit(1);
  }
  const raw = readFileSync(CSV_PATH, "utf8");
  const rows = parseCsv(raw);
  const header = rows[0];
  const idx = (name: string) => header.indexOf(name);

  const col = {
    id: idx("Book Id"),
    title: idx("Title"),
    author: idx("Author"),
    isbn13: idx("ISBN13"),
    rating: idx("My Rating"),
    pages: idx("Number of Pages"),
    yearPub: idx("Year Published"),
    origYear: idx("Original Publication Year"),
    dateRead: idx("Date Read"),
    shelves: idx("Bookshelves"),
    exclusive: idx("Exclusive Shelf"),
    review: idx("My Review"),
  };

  const books: Book[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < header.length) continue;
    if (row[col.exclusive]?.trim() !== "read") continue; // spec 1.2 step 2

    const id = row[col.id]?.trim();
    if (!id) continue;
    const rating = Math.round(num(row[col.rating]) ?? 0);
    const isbn13 = cleanIsbn(row[col.isbn13] ?? "");
    const shelves = (row[col.shelves] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const review = row[col.review]?.trim();

    books.push({
      id,
      title: row[col.title]?.trim() ?? "",
      author: row[col.author]?.trim() ?? "",
      myRating: rating,
      ...(review ? { myReview: stripHtml(review) } : {}),
      shelves,
      ...(isoDate(row[col.dateRead] ?? "")
        ? { dateRead: isoDate(row[col.dateRead] ?? "") }
        : {}),
      ...(num(row[col.pages]) ? { pages: num(row[col.pages]) } : {}),
      ...(num(row[col.origYear] ?? "") || num(row[col.yearPub] ?? "")
        ? {
            yearPublished:
              num(row[col.origYear] ?? "") ?? num(row[col.yearPub] ?? ""),
          }
        : {}),
      ...(isbn13 ? { isbn13 } : {}),
      ...(coverUrl(isbn13) ? { coverUrl: coverUrl(isbn13) } : {}),
      goodreadsUrl: `https://www.goodreads.com/book/show/${id}`,
    });
  }

  // Preserve enriched cover URLs from a previous build (scripts/fetch-covers.ts
  // resolves real covers into library.json — don't wipe them when re-running).
  if (existsSync(OUT_PATH)) {
    try {
      const prev = JSON.parse(readFileSync(OUT_PATH, "utf8")) as Book[];
      const prevCover = new Map(
        prev.filter((b) => b.coverUrl).map((b) => [b.id, b.coverUrl!])
      );
      for (const b of books) {
        const kept = prevCover.get(b.id);
        if (kept) b.coverUrl = kept;
      }
    } catch {
      /* ignore a malformed previous file */
    }
  }

  // Merge in anything new from the RSS "read" shelf feed (dedupe on Book Id).
  const byId = new Map(books.map((b) => [b.id, b]));
  const rss = await fetchRssBooks();
  for (const [id, r] of rss) {
    const existing = byId.get(id);
    if (existing) {
      // fill gaps only — the CSV is the richer source of truth
      if (!existing.coverUrl && r.coverUrl) existing.coverUrl = r.coverUrl;
      if (!existing.myReview && r.myReview) existing.myReview = r.myReview;
    } else if (r.myRating && r.myRating >= 1 && r.title) {
      books.push({
        id,
        title: r.title,
        author: r.author ?? "",
        myRating: r.myRating,
        ...(r.myReview ? { myReview: r.myReview } : {}),
        shelves: [],
        ...(r.coverUrl ? { coverUrl: r.coverUrl } : {}),
        goodreadsUrl: r.goodreadsUrl ?? `https://www.goodreads.com/book/show/${id}`,
      });
    }
  }

  // Drop books Aja has removed (data/removed.json) — survives regeneration.
  const removedPath = join(ROOT, "data", "removed.json");
  if (existsSync(removedPath)) {
    const rm = JSON.parse(readFileSync(removedPath, "utf8")) as {
      ids?: string[];
      authors?: string[];
    };
    const idSet = new Set(rm.ids ?? []);
    const authors = (rm.authors ?? []).map((a) => a.toLowerCase());
    const isRemoved = (b: Book) =>
      idSet.has(b.id) ||
      authors.some((a) => b.author.toLowerCase().includes(a));
    for (let i = books.length - 1; i >= 0; i--) {
      if (isRemoved(books[i])) books.splice(i, 1);
    }
  }

  // Newest reads first is a sensible default order.
  books.sort((a, b) => (b.dateRead ?? "").localeCompare(a.dateRead ?? ""));

  writeFileSync(OUT_PATH, JSON.stringify(books, null, 2) + "\n");

  // ── Stats report (spec build order step 1) ──────────────────────────────
  const loved = books.filter((b) => b.myRating >= 4);
  const dist = [1, 2, 3, 4, 5].map(
    (s) => `${s}★:${books.filter((b) => b.myRating === s).length}`
  );
  console.log(`\n✓ Wrote ${OUT_PATH}`);
  console.log(`  Read books:        ${books.length}`);
  console.log(`  Recommendable 4–5★: ${loved.length}`);
  console.log(`  Rating spread:     ${dist.join("  ")}`);
  console.log(
    `  With ISBN/cover:   ${books.filter((b) => b.coverUrl).length}`
  );
  console.log(
    `  With a review:     ${books.filter((b) => b.myReview).length}\n`
  );
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

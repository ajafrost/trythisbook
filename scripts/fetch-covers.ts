/**
 * fetch-covers.ts — enrich data/library.json with real cover images.
 *
 * Uses the Open Library Search API, which returns a `cover_i` catalogue id whose
 * cover reliably exists (unlike the by-ISBN URL, which 404s for many editions).
 * Resolves each 4–5★ book (the ones the site shows) by ISBN first, then by
 * title + author. Books with no cover anywhere keep the pastel placeholder.
 * Re-runnable; polite concurrency + backoff.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Book } from "../lib/library";

const LIB = join(process.cwd(), "data", "library.json");
const CONCURRENCY = 4;
const UA = "trythisbook/1.0 (personal book site; contact aja.t.frost@gmail.com)";

const books = JSON.parse(readFileSync(LIB, "utf8")) as Book[];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function search(params: string): Promise<number | undefined> {
  const url = `https://openlibrary.org/search.json?${params}&fields=cover_i,title&limit=1`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA } });
      if (res.status === 429 || res.status >= 500) {
        await sleep(2000 * (attempt + 1));
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

async function resolveCoverId(b: Book): Promise<number | undefined> {
  if (b.isbn13) {
    const byIsbn = await search(`isbn=${encodeURIComponent(b.isbn13)}`);
    if (byIsbn) return byIsbn;
  }
  return search(
    `title=${encodeURIComponent(b.title)}&author=${encodeURIComponent(b.author)}`
  );
}

async function main() {
  const targets = books.filter((b) => b.myRating >= 4);
  let found = 0;
  let processed = 0;

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (b) => {
        const coverId = await resolveCoverId(b);
        if (coverId) {
          b.coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
          found++;
        }
        processed++;
      })
    );
    process.stdout.write(`\r  ${processed}/${targets.length} · ${found} covers`);
    await sleep(300);
  }

  writeFileSync(LIB, JSON.stringify(books, null, 2) + "\n");
  const withCover = targets.filter((b) => b.coverUrl).length;
  console.log(
    `\n✓ Updated ${LIB}\n  ${found} covers resolved from Open Library\n  ${withCover}/${targets.length} of the 4–5★ books now have a cover\n`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * enrich-isbns.ts — fill in missing ISBNs (for Bookshop.org affiliate links).
 *
 * Many older/classic titles came out of Goodreads with no ISBN. For each loved
 * book missing one, search Open Library by title+author, sanity-check the match,
 * and store a real ISBN-13 (converting ISBN-10 when that's all there is). Books
 * that already have an ISBN are left alone. Re-runnable; polite concurrency.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Book } from "../lib/library";

const LIB = join(process.cwd(), "data", "library.json");
const UA = "trythisbook/1.0 (isbn enrichment; aja.t.frost@gmail.com)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function norm(s: string): string {
  return s
    .toLowerCase()
    .split(":")[0]
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/^(the|a|an) /, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isbn10to13(i: string): string {
  const core = "978" + i.slice(0, 9);
  let sum = 0;
  for (let k = 0; k < 12; k++) sum += Number(core[k]) * (k % 2 ? 3 : 1);
  return core + String((10 - (sum % 10)) % 10);
}

// Pick the best ISBN-13 from an Open Library `isbn` list.
function pick(isbns: string[] | undefined): string | undefined {
  if (!isbns?.length) return undefined;
  const clean = isbns.map((x) => x.replace(/[^0-9Xx]/g, ""));
  const t13 = clean.find((x) => x.length === 13 && /^97[89]/.test(x));
  if (t13) return t13;
  const t10 = clean.find((x) => x.length === 10);
  return t10 ? isbn10to13(t10) : undefined;
}

async function lookup(b: Book): Promise<string | undefined> {
  const url =
    `https://openlibrary.org/search.json?` +
    `title=${encodeURIComponent(b.title.split(":")[0])}` +
    `&author=${encodeURIComponent(b.author.trim())}` +
    `&fields=title,isbn&limit=3`;
  for (let a = 0; a < 3; a++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA } });
      if (res.status === 429 || res.status >= 500) {
        await sleep(1500 * (a + 1));
        continue;
      }
      if (!res.ok) return undefined;
      const j = (await res.json()) as {
        docs?: { title?: string; isbn?: string[] }[];
      };
      const want = norm(b.title);
      const doc =
        j.docs?.find((d) => d.title && norm(d.title) === want) ?? j.docs?.[0];
      // Only trust a match whose title is close, to avoid wrong-book ISBNs.
      if (doc?.title && norm(doc.title) === want) return pick(doc.isbn);
      return undefined;
    } catch {
      await sleep(600);
    }
  }
  return undefined;
}

async function main() {
  const books = JSON.parse(readFileSync(LIB, "utf8")) as Book[];
  const targets = books.filter(
    (b) => b.myRating >= 4 && !(b.isbn13 ?? "").trim()
  );
  console.log(`Books missing an ISBN: ${targets.length}`);
  let found = 0;
  const CONC = 5;
  for (let i = 0; i < targets.length; i += CONC) {
    const batch = targets.slice(i, i + CONC);
    await Promise.all(
      batch.map(async (b) => {
        const isbn = await lookup(b);
        if (isbn) {
          b.isbn13 = isbn;
          found++;
        }
      })
    );
    process.stdout.write(`\r  ${Math.min(i + CONC, targets.length)}/${targets.length} · ${found} found`);
    await sleep(250);
  }
  writeFileSync(LIB, JSON.stringify(books, null, 2) + "\n");
  console.log(`\n✓ Filled ${found} ISBNs (${targets.length - found} still missing).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

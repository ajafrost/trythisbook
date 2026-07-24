/**
 * fill-covers.ts — second pass for books still lacking a reliable cover.
 *
 * Retries the gaps against Open Library with a CLEANED title (strips series
 * markers like "(Olive Kitteridge, #1)" and subtitles after ":"), which is why
 * many older titles failed the first pass. OL isn't rate-limited like Google.
 * Re-runnable; genuinely cover-less 2026 titles just stay as placeholders.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Book } from "../lib/library";

const LIB = join(process.cwd(), "data", "library.json");
const CONCURRENCY = 4;
const UA = "trythisbook/1.0 (personal book site; aja.t.frost@gmail.com)";
const books = JSON.parse(readFileSync(LIB, "utf8")) as Book[];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cleanTitle(t: string): string {
  return t
    .replace(/\s*\([^)]*\)\s*/g, " ") // drop "(series, #1)" etc.
    .split(":")[0] // drop subtitle
    .replace(/\s+/g, " ")
    .trim();
}

async function olCover(params: string): Promise<number | undefined> {
  const url = `https://openlibrary.org/search.json?${params}&fields=cover_i&limit=1`;
  for (let a = 0; a < 3; a++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA } });
      if (res.status === 429 || res.status >= 500) {
        await sleep(1500 * (a + 1));
        continue;
      }
      if (!res.ok) return undefined;
      return ((await res.json()) as { docs?: { cover_i?: number }[] }).docs?.[0]
        ?.cover_i;
    } catch {
      await sleep(600);
    }
  }
  return undefined;
}

async function resolve(b: Book): Promise<string | undefined> {
  const title = cleanTitle(b.title);
  const cover =
    (b.isbn13 && (await olCover(`isbn=${encodeURIComponent(b.isbn13)}`))) ||
    (await olCover(
      `title=${encodeURIComponent(title)}&author=${encodeURIComponent(b.author)}`
    )) ||
    (await olCover(`q=${encodeURIComponent(`${title} ${b.author}`)}`));
  return cover ? `https://covers.openlibrary.org/b/id/${cover}-L.jpg` : undefined;
}

async function main() {
  const gaps = books.filter(
    (b) => b.myRating >= 4 && !(b.coverUrl && b.coverUrl.includes("/b/id/"))
  );
  console.log(`Retrying ${gaps.length} missing covers on Open Library…`);
  let found = 0,
    done = 0;
  for (let i = 0; i < gaps.length; i += CONCURRENCY) {
    await Promise.all(
      gaps.slice(i, i + CONCURRENCY).map(async (b) => {
        const c = await resolve(b);
        if (c) {
          b.coverUrl = c;
          found++;
        }
        done++;
      })
    );
    process.stdout.write(`\r  ${done}/${gaps.length} · ${found} new covers`);
    await sleep(250);
  }
  writeFileSync(LIB, JSON.stringify(books, null, 2) + "\n");
  const loved = books.filter((b) => b.myRating >= 4);
  const withReliable = loved.filter(
    (b) => b.coverUrl && b.coverUrl.includes("/b/id/")
  ).length;
  console.log(
    `\n✓ ${found} new covers · ${withReliable}/${loved.length} of 4–5★ books now have a real cover\n`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

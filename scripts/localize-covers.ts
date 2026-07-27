/**
 * localize-covers.ts — download any remote (Open Library) covers, compress them,
 * and serve them locally from public/covers so no cover loads from a slow remote
 * origin. Runs after the Goodreads sync (see .github/workflows/goodreads-sync.yml)
 * so newly-added books don't reintroduce heavy, remote, un-prioritizable covers.
 *
 * For each 4–5★ book whose coverUrl is an http(s) URL: fetch it, resize to 440px
 * wide (~2× the largest on-page display), re-encode as progressive JPEG q80, save
 * to public/covers/<id>.jpg, and rewrite coverUrl to the local path. Open Library
 * "no cover" placeholders (tiny images) are left remote. Re-runnable.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const LIB = join(ROOT, "data", "library.json");
const COVERS = join(ROOT, "public", "covers");
const TARGET_W = 440;
const CONCURRENCY = 6;
const UA = "trythisbook/1.0 (cover localizer; aja.t.frost@gmail.com)";

type Book = { id: string; myRating: number; coverUrl?: string };

async function localize(b: Book): Promise<string | null> {
  try {
    const res = await fetch(b.coverUrl!, {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf, { failOn: "none" }).metadata();
    if (!meta.width || !meta.height || meta.width < 150 || meta.height < 150) {
      return null; // Open Library placeholder / too small — keep remote
    }
    const out = await sharp(buf, { failOn: "none" })
      .resize({ width: TARGET_W, withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true, mozjpeg: true })
      .toBuffer();
    writeFileSync(join(COVERS, `${b.id}.jpg`), out);
    return `/covers/${b.id}.jpg`;
  } catch {
    return null;
  }
}

async function main() {
  const lib = JSON.parse(readFileSync(LIB, "utf8")) as Book[];
  const targets = lib.filter(
    (b) => b.myRating >= 4 && (b.coverUrl ?? "").startsWith("http")
  );
  console.log(`Remote covers to localize: ${targets.length}`);

  const updates: Record<string, string> = {};
  let ok = 0;
  const queue = [...targets];
  async function worker() {
    while (queue.length) {
      const b = queue.shift()!;
      const url = await localize(b);
      if (url) {
        updates[b.id] = url;
        ok++;
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (ok > 0) {
    for (const b of lib) if (updates[b.id]) b.coverUrl = updates[b.id];
    writeFileSync(LIB, JSON.stringify(lib, null, 2) + "\n");
  }
  console.log(`✓ Localized ${ok}; left remote ${targets.length - ok}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * merge-blurbs.ts — fold generated blurb batches into data/curation.json.
 *
 * Reads every out-*.json in the batch dir (id → blurb) and adds non-empty
 * blurbs to curation.blurbs, flagged needsReview for Aja's edit pass. Never
 * overwrites an existing blurb (the review-seeded ones are her real words).
 * Idempotent — safe to re-run as more batches land.
 *
 * Usage: tsx scripts/merge-blurbs.ts <batch-dir>
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const CUR = join(process.cwd(), "data", "curation.json");
const dir = process.argv[2];
if (!dir || !existsSync(dir)) {
  console.error("Pass the batch directory containing out-*.json");
  process.exit(1);
}

const curation = JSON.parse(readFileSync(CUR, "utf8")) as {
  blurbs: Record<string, { text: string; needsReview?: boolean }>;
};

let added = 0;
let skippedExisting = 0;
const files = readdirSync(dir).filter((f) => /^out-\d+\.json$/.test(f));
for (const f of files) {
  const map = JSON.parse(readFileSync(join(dir, f), "utf8")) as Record<
    string,
    string
  >;
  for (const [id, blurb] of Object.entries(map)) {
    const text = (blurb ?? "").trim();
    if (!text) continue;
    if (curation.blurbs[id]?.text) {
      skippedExisting++;
      continue;
    }
    curation.blurbs[id] = { text, needsReview: true };
    added++;
  }
}

writeFileSync(CUR, JSON.stringify(curation, null, 2) + "\n");
console.log(
  `✓ Merged ${files.length} batch file(s)\n  ${added} blurbs added\n  ${skippedExisting} skipped (already had a blurb)\n  ${Object.keys(curation.blurbs).length} total blurbs now in curation.json`
);

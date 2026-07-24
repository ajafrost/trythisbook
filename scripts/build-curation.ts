/**
 * build-curation.ts — generate a STARTER data/curation.json for Aja's edit pass.
 *
 * Spec 1.4: pre-populate every shelf with proposed book IDs and flag them all
 * for review. Aja's Goodreads shelf tags are almost entirely empty, so we seed
 * themed shelves by matching the example titles listed in the spec against the
 * real library, and derive the rule-based shelves (pre-2005, smart-but-easy,
 * favorite authors) automatically. Only 4–5★ books qualify.
 *
 * This file is a DRAFT. Every shelf is marked needsReview. Aja owns the final
 * picks, names, and descriptions in data/curation.json going forward — this
 * script just gives her a populated starting point. Re-running it OVERWRITES,
 * so once Aja edits curation.json by hand, don't re-run without merging.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Book, Curation, Shelf } from "../lib/library";

const ROOT = process.cwd();
const LIB_PATH = join(ROOT, "data", "library.json");
const OUT_PATH = join(ROOT, "data", "curation.json");

if (!existsSync(LIB_PATH)) {
  console.error("✗ Run build-library.ts first (data/library.json missing).");
  process.exit(1);
}
const books = JSON.parse(readFileSync(LIB_PATH, "utf8")) as Book[];
const loved = books.filter((b) => b.myRating >= 4);

// ── title matching ───────────────────────────────────────────────────────────
function norm(s: string): string {
  return s
    .toLowerCase()
    .split(":")[0] // drop subtitles
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/^(the|a|an) /, "")
    .replace(/\s+/g, " ")
    .trim();
}
const byNorm = new Map<string, Book>();
for (const b of loved) {
  const key = norm(b.title);
  if (!byNorm.has(key)) byNorm.set(key, b);
}
const missing: string[] = [];
function match(title: string): string | undefined {
  const key = norm(title);
  const exact = byNorm.get(key);
  if (exact) return exact.id;
  // loose contains match against loved titles
  const loose = loved.find((b) => {
    const n = norm(b.title);
    return n === key || n.startsWith(key) || key.startsWith(n);
  });
  if (loose) return loose.id;
  missing.push(title);
  return undefined;
}
function ids(titles: string[]): string[] {
  return titles.map(match).filter((x): x is string => !!x);
}

// ── author matching (for "Authors who never let me down") ─────────────────────
function byAuthor(name: string): string[] {
  const last = name.toLowerCase().split(" ").pop() ?? name.toLowerCase();
  return loved
    .filter((b) => {
      const a = b.author.toLowerCase();
      return a.includes(name.toLowerCase()) || a.includes(last);
    })
    .sort((a, b) => b.myRating - a.myRating)
    .map((b) => b.id);
}

// ── shelf definitions (names/descriptions are drafts for Aja) ─────────────────
const shelves: Shelf[] = [];
const draft = (
  slug: string,
  name: string,
  description: string,
  bookIds: string[],
  extra: Partial<Shelf> = {}
) => shelves.push({ slug, name, description, bookIds, needsReview: true, ...extra });

// 1. Highest-conviction: 5★ books that Aja actually reviewed (strong signal),
//    padded with other 5★ if thin. Doubles as the crowd-pleasers fallback.
const fiveStar = loved.filter((b) => b.myRating === 5);
const fiveStarReviewed = fiveStar.filter((b) => b.myReview);
const textMe = [
  ...fiveStarReviewed.map((b) => b.id),
  ...fiveStar.filter((b) => !b.myReview).slice(0, 20).map((b) => b.id),
];
draft(
  "texted-me",
  "The books people text me when they finish",
  "My highest-conviction recs — the ones that get a reaction.",
  textMe
);

// 2. Rule-based: 4–5★ published before 2005.
const pre2005 = loved
  .filter((b) => b.yearPublished && b.yearPublished < 2005)
  .sort((a, b) => b.myRating - a.myRating)
  .map((b) => b.id);
draft(
  "library-instock",
  "In-stock at the library (written before 2005)",
  "Older favorites your library definitely has a copy of.",
  pre2005
);

// 3–11. Themed shelves seeded from the spec's example titles.
draft(
  "page-turners",
  "Page-turners",
  "Thrillers, mysteries, anything propulsive.",
  ids(["The Likeness", "The Guest", "Gone Girl", "The God of the Woods"])
);
draft(
  "reads-like-fiction",
  "Non-fiction that reads like fiction",
  "True stories that move like novels.",
  ids(["Wild Swans", "The Wager", "Bad Blood", "We Keep the Dead Close"])
);
draft(
  "corporate-implosions",
  "Corporate implosions",
  "Business and media scandals, gloriously told.",
  ids([
    "Bad Blood",
    "Empire of Pain",
    "Super Pumped",
    "The Fund",
    "Careless People",
    "DisneyWar",
    "Anna",
    "Anna: The Biography",
  ])
);
draft(
  "make-you-hungry",
  "Books that will make you hungry",
  "Food writing to read with a snack nearby.",
  ids([
    "Save Me the Plums",
    "Home Cooking",
    "Sweetbitter",
    "Garlic and Sapphires",
    "Taste",
    "The Lemon",
  ])
);
draft(
  "platonic-love",
  "Platonic love stories",
  "Friendship, fiction and non.",
  ids([
    "Truth & Beauty",
    "Big Friendship",
    "Girls They Write Songs About",
    "Tin Man",
    "Fiona and Jane",
    "The Interestings",
  ])
);
draft(
  "campus-novels",
  "Campus novels",
  "Secrets, seminars, and people who peaked at 20.",
  ids([
    "The Secret History",
    "If We Were Villains",
    "The Likeness",
    "Trust Exercise",
    "The Truants",
    "The Art of Fielding",
    "Black Chalk",
  ])
);
draft(
  "reality-tv",
  "Reality TV, in book form",
  "Messy, addictive, can't-look-away.",
  ids([
    "Small Game",
    "The Compound",
    "You Wanna Be on Top?",
    "Disney High",
    "The Favorites",
    "Such a Bad Influence",
  ])
);
draft(
  "short-devastating",
  "Short but devastating",
  "One-sitting emotional wallops.",
  ids([
    "Foster",
    "Small Things Like These",
    "Ordinary Human Failings",
    "Tilt",
    "Perfection",
  ])
);
draft(
  "weird-good",
  "Weird in a great way",
  "Literary fiction with one speculative twist.",
  ids([
    "Piranesi",
    "The Husbands",
    "My Murder",
    "The School for Good Mothers",
    "The Other Valley",
    "Beautyland",
  ])
);

// 12. Rule-based: Aja's existing Goodreads "smart-but-easy" shelf tag.
const smartEasy = loved
  .filter((b) => b.shelves.includes("smart-but-easy"))
  .map((b) => b.id);
draft(
  "smart-but-easy",
  "Smart but easy",
  "Substantial, but a breeze to read.",
  smartEasy
);

// 13. Author-grouped: favorite authors, each with their 4–5★ books.
const favoriteAuthors = [
  "Ann Patchett",
  "Anne Tyler",
  "Lily King",
  "Emma Straub",
  "Catherine Newman",
  "Anna Quindlen",
  "Annie Hartnett",
  "Curtis Sittenfeld",
  "Elinor Lipman",
  "Liz Moore",
  "Rachel Khong",
  "Leslie Jamison",
  "Dolly Alderton",
  "Alice McDermott",
  "Katherine Heiny",
];
const authorIds: string[] = [];
const authorReport: string[] = [];
for (const a of favoriteAuthors) {
  const found = byAuthor(a);
  authorIds.push(...found);
  authorReport.push(`${a}: ${found.length}`);
}
draft(
  "trusted-authors",
  "Authors who never let me down",
  "The writers I'll follow anywhere.",
  authorIds,
  { groupByAuthor: true }
);

// ── blurbs: seed from Aja's own Goodreads reviews where present ───────────────
// (Real words only — no invented anecdotes, per how-aja-writes-about-books.md.)
const blurbs: Curation["blurbs"] = {};
for (const b of loved) {
  if (b.myReview && b.myReview.length > 20) {
    blurbs[b.id] = {
      text: b.myReview.replace(/\s+/g, " ").trim().slice(0, 400),
      needsReview: true,
    };
  }
}

// Preserve blurbs already in curation.json (generated drafts + Aja's edits) so
// re-running this starter generator never wipes real work.
if (existsSync(OUT_PATH)) {
  try {
    const prev = JSON.parse(readFileSync(OUT_PATH, "utf8")) as Curation;
    for (const [id, blurb] of Object.entries(prev.blurbs ?? {})) {
      if (blurb?.text) blurbs[id] = blurb;
    }
  } catch {
    /* ignore a malformed previous file */
  }
}

const curation: Curation = {
  blurbs,
  shelves,
  crowdPleasersSlug: "texted-me",
};

writeFileSync(OUT_PATH, JSON.stringify(curation, null, 2) + "\n");

// ── report ───────────────────────────────────────────────────────────────────
console.log(`\n✓ Wrote ${OUT_PATH} (STARTER — flag-for-review draft)\n`);
console.log("  Shelf                                    Books");
console.log("  ──────────────────────────────────────── ─────");
for (const s of shelves) {
  console.log(`  ${s.name.padEnd(40)} ${String(s.bookIds.length).padStart(4)}`);
}
console.log(`\n  Seeded blurbs from reviews: ${Object.keys(blurbs).length}`);
if (missing.length) {
  console.log(
    `\n  ⚠ ${missing.length} example title(s) not found in library (Aja may not have them, or titles differ):`
  );
  for (const m of [...new Set(missing)]) console.log(`      · ${m}`);
}
console.log("\n  Author breakdown (Authors who never let me down):");
console.log("     " + authorReport.join("  ·  "));
console.log();

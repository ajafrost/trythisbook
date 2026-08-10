import libraryData from "@/data/library.json";
import curationData from "@/data/curation.json";
import genreData from "@/data/genres.json";

// Genre taxonomy for the wall's Genre filter (slug → label).
export const GENRES: { slug: string; label: string }[] = [
  { slug: "literary-fiction", label: "Literary fiction" },
  { slug: "romance", label: "Romance" },
  { slug: "mystery-thriller", label: "Mystery & thriller" },
  { slug: "scifi-fantasy", label: "Sci-fi & fantasy" },
  { slug: "historical-fiction", label: "Historical fiction" },
  { slug: "short-stories", label: "Short stories" },
  { slug: "young-adult", label: "Young adult" },
  { slug: "memoir", label: "Memoir" },
  { slug: "biography", label: "Biography" },
  { slug: "narrative-nonfiction", label: "Narrative nonfiction" },
  { slug: "essays", label: "Essays" },
  { slug: "self-help", label: "Self-help" },
  { slug: "history", label: "History" },
  { slug: "food", label: "Food & cooking" },
];
const genreMap = genreData as Record<string, string[]>;

// ── Types ───────────────────────────────────────────────────────────────────

export type Book = {
  id: string; // Goodreads Book Id
  title: string;
  author: string;
  myRating: number; // Aja's rating, 1–5
  myReview?: string; // Aja's review text, if any — gold for the AI
  shelves: string[]; // Goodreads shelf tags
  dateRead?: string;
  pages?: number;
  yearPublished?: number; // original publication year, preferred
  isbn13?: string;
  coverUrl?: string;
  goodreadsUrl: string;
};

export type Shelf = {
  slug: string;
  name: string;
  description: string;
  bookIds: string[];
  // Author-grouped shelves ("Authors who never let me down") render by author.
  groupByAuthor?: boolean;
  // Everything Claude Code proposes is flagged for Aja's edit pass.
  needsReview?: boolean;
};

export type Curation = {
  // Per-book blurbs in Aja's voice, keyed by book id. Drafts until Aja edits.
  blurbs: Record<string, { text: string; needsReview?: boolean }>;
  shelves: Shelf[];
  // Shelf slug used for the graceful-failure fallback in the rec engine.
  crowdPleasersSlug: string;
};

// ── Data ────────────────────────────────────────────────────────────────────

const curation = curationData as unknown as Curation;
const allBooks = libraryData as unknown as Book[];

// The recommendable / displayable pool: 4–5★ only (spec 1.3 "Loved" threshold).
export const lovedBooks: Book[] = allBooks.filter((b) => b.myRating >= 4);

// Full read set (incl. lower ratings) — kept as signal for the AI only.
export const readBooks: Book[] = allBooks;

const byId = new Map(allBooks.map((b) => [b.id, b]));

export function getBook(id: string): Book | undefined {
  return byId.get(id);
}

export function getBlurb(id: string): string | undefined {
  const b = curation.blurbs[id];
  if (b?.text) return b.text;
  // fall back to an excerpt of Aja's Goodreads review, if present
  const review = getBook(id)?.myReview?.trim();
  if (review) return excerpt(review, 280);
  return undefined;
}

export function excerpt(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

export const shelves: Shelf[] = curation.shelves;

export function getShelf(slug: string): Shelf | undefined {
  return shelves.find((s) => s.slug === slug);
}

// Books on a shelf, in curated order, filtered to ones that still exist & are 4–5★.
export function shelfBooks(slug: string): Book[] {
  const shelf = getShelf(slug);
  if (!shelf) return [];
  return shelf.bookIds
    .map((id) => byId.get(id))
    .filter((b): b is Book => !!b && b.myRating >= 4);
}

export function crowdPleasers(): Book[] {
  return shelfBooks(curation.crowdPleasersSlug);
}

// Which curated shelves does this book appear on? (for chips on cards/overlay)
const shelfMembership = new Map<string, Shelf[]>();
for (const shelf of shelves) {
  for (const id of shelf.bookIds) {
    const arr = shelfMembership.get(id) ?? [];
    arr.push(shelf);
    shelfMembership.set(id, arr);
  }
}
export function bookShelves(id: string): Shelf[] {
  return shelfMembership.get(id) ?? [];
}

// ── URL slugs (title-author) ─────────────────────────────────────────────────
// Every loved book gets its own static page at /book/<slug>. Slugs are readable
// and keyword-rich (best for search + AI answer engines). Kept here — not a
// separate module — so slug.ts ↔ library.ts can't form a circular import.

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "") // don't → dont, not don-t
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const idToSlug = new Map<string, string>();
const slugToId = new Map<string, string>();
for (const b of lovedBooks) {
  const base = `${slugify(b.title)}-${slugify(b.author)}`.replace(/^-+|-+$/g, "");
  let slug = base || b.id;
  let n = 2;
  while (slugToId.has(slug)) slug = `${base}-${n++}`; // disambiguate collisions
  idToSlug.set(b.id, slug);
  slugToId.set(slug, b.id);
}

export function bookSlug(id: string): string | undefined {
  return idToSlug.get(id);
}
export function bookIdFromSlug(slug: string): string | undefined {
  return slugToId.get(slug);
}
export function bookPath(id: string): string {
  const slug = idToSlug.get(id);
  return slug ? `/book/${slug}` : "/";
}
export function allBookSlugs(): string[] {
  return [...slugToId.keys()];
}

// ── Genre lookups ────────────────────────────────────────────────────────────
export function bookGenres(id: string): string[] {
  return genreMap[id] ?? [];
}
// Loved books tagged with a genre, in library order (most recently read first).
export function genreBooks(slug: string): Book[] {
  return lovedBooks.filter((b) => (genreMap[b.id] ?? []).includes(slug));
}
export function genreLabel(slug: string): string {
  return GENRES.find((g) => g.slug === slug)?.label ?? slug;
}

// ── Derived helpers for filters (spec 2.4) ───────────────────────────────────

export function isShort(b: Book): boolean {
  return !!b.pages && b.pages <= 250;
}
export function isLong(b: Book): boolean {
  return !!b.pages && b.pages >= 450;
}
export function decadeOf(b: Book): number | undefined {
  if (!b.yearPublished) return undefined;
  return Math.floor(b.yearPublished / 10) * 10;
}

// Goodreads has no fiction/non-fiction field, so we infer it: a book is treated
// as non-fiction if it sits on a non-fiction-leaning curated shelf. Approximate
// — Aja can refine by curating shelves. Everything else defaults to fiction
// (the bulk of the library).
const NONFICTION_SHELVES = new Set([
  "reads-like-fiction",
  "corporate-implosions",
  "make-you-hungry",
]);
export function isNonfiction(id: string): boolean {
  return bookShelves(id).some((s) => NONFICTION_SHELVES.has(s.slug));
}

// Flat, serializable record for the client-side library wall (spec 2.4).
export type WallBook = {
  id: string;
  slug: string;
  title: string;
  author: string;
  coverUrl?: string;
  myRating: number;
  pages?: number;
  yearPublished?: number;
  readYear?: number;
  goodreadsUrl: string;
  isbn13?: string;
  shelfSlugs: string[];
  blurb?: string;
  genres: string[];
};

export function wallData(): {
  books: WallBook[];
  shelves: { slug: string; name: string }[];
} {
  const books: WallBook[] = lovedBooks.map((b) => ({
    id: b.id,
    slug: idToSlug.get(b.id) ?? b.id,
    title: b.title,
    author: b.author,
    ...(b.coverUrl ? { coverUrl: b.coverUrl } : {}),
    myRating: b.myRating,
    ...(b.pages ? { pages: b.pages } : {}),
    ...(b.yearPublished ? { yearPublished: b.yearPublished } : {}),
    ...(b.dateRead ? { readYear: Number(b.dateRead.slice(0, 4)) } : {}),
    goodreadsUrl: b.goodreadsUrl,
    ...(b.isbn13 ? { isbn13: b.isbn13 } : {}),
    shelfSlugs: bookShelves(b.id).map((s) => s.slug),
    ...(getBlurb(b.id) ? { blurb: getBlurb(b.id) } : {}),
    genres: genreMap[b.id] ?? [],
  }));
  return {
    books,
    shelves: shelves
      .filter((s) => shelfBooks(s.slug).length > 0)
      .map((s) => ({ slug: s.slug, name: s.name })),
  };
}

// "If you liked this, try…" comps for a book (spec 2.5). Score every other book
// by shared curated shelves (strongest), then shared genres weighted by rarity,
// then same author. Genres matter because ~70% of loved books sit on no curated
// shelf — but the genre set is coarse (2/3 of the library is "literary-fiction"),
// so a shared common genre is a weak signal and a shared rare one is a strong
// one; rarity weighting stops every literary novel recommending the same handful
// of top-rated literary novels. Ties break on a per-book deterministic shuffle
// (not rating) so different books get different picks. Pad from crowd-pleasers
// only when still thin. Returns plain data safe to pass to client components.
export type Comp = { id: string; title: string; author: string };

// De-dupe by title+author, not id: the library has re-read duplicates (two rows
// for the same book), so two distinct ids can be the same title — we never want
// a book shown twice, or a re-read of the current book shown as its own comp.
const compKey = (b: Book): string => `${b.title}|${b.author}`.toLowerCase();

// Rarity weight per genre: ln(total / how-many-loved-books-have-it). Ubiquitous
// genres ("literary-fiction", on ~2/3 of books) land near 0; rare ones score
// high. Computed once — lovedBooks and genres are static at build time.
const genreWeight: Map<string, number> = (() => {
  const freq = new Map<string, number>();
  for (const b of lovedBooks)
    for (const g of bookGenres(b.id)) freq.set(g, (freq.get(g) ?? 0) + 1);
  const weight = new Map<string, number>();
  for (const [g, n] of freq) weight.set(g, Math.log(lovedBooks.length / n));
  return weight;
})();

export function compsFor(id: string, count = 2): Comp[] {
  const self = getBook(id);
  if (!self) return [];
  const myShelves = new Set(bookShelves(id).map((s) => s.slug));
  const myGenres = new Set(bookGenres(id));

  const scored = lovedBooks
    .filter((b) => b.id !== id)
    .map((b) => {
      const sharedShelves = bookShelves(b.id).filter((s) =>
        myShelves.has(s.slug),
      ).length;
      const genreScore = bookGenres(b.id)
        .filter((g) => myGenres.has(g))
        .reduce((sum, g) => sum + (genreWeight.get(g) ?? 0), 0);
      const sameAuthor = b.author === self.author ? 1 : 0;
      return {
        b,
        score: sharedShelves * 10 + sameAuthor * 5 + genreScore,
        // Stable per (this book, candidate) → varied across books, fixed per book.
        jitter: hashPair(id, b.id),
      };
    })
    .filter((x) => x.score > 0)
    // Score decides real matches; jitter (not rating) breaks ties, so books that
    // only share a common genre don't all surface the same top-rated titles.
    .sort((a, b) => b.score - a.score || a.jitter - b.jitter);

  const picks: Book[] = [];
  const usedKeys = new Set<string>([compKey(self)]);
  const take = (b: Book) => {
    const key = compKey(b);
    if (b.id === id || picks.length >= count || usedKeys.has(key)) return;
    usedKeys.add(key);
    picks.push(b);
  };

  for (const x of scored) take(x.b);
  // Pad from crowd-pleasers if still thin, shuffled per book (stable across
  // rebuilds, varied across books) so orphan pages don't all show the same top 3.
  if (picks.length < count) {
    for (const b of seededShuffle(crowdPleasers(), id)) take(b);
  }
  return picks.map((b) => ({ id: b.id, title: b.title, author: b.author }));
}

// Deterministic [0,1) from a pair of ids (FNV-1a). Stable per pair, well spread
// across pairs — used to break comp-score ties without favoring any book.
function hashPair(a: string, b: string): number {
  let h = 2166136261;
  const s = `${a}|${b}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

// Deterministic shuffle keyed to a seed string (FNV-1a hash → mulberry32 PRNG).
// Same seed always yields the same order, so a book's padding is stable build to
// build, but different books get different orderings.
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

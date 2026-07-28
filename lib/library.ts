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

// Two "if you liked this, try…" comps for a book (spec 2.5). Prefer books that
// share the most curated shelves; tiebreak by same author; fall back to a
// crowd-pleaser. Returns plain data safe to pass to client components.
export type Comp = { id: string; title: string; author: string };
export function compsFor(id: string, count = 2): Comp[] {
  const self = getBook(id);
  if (!self) return [];
  const mine = new Set(bookShelves(id).map((s) => s.slug));
  const scored = lovedBooks
    .filter((b) => b.id !== id)
    .map((b) => {
      const shared = bookShelves(b.id).filter((s) => mine.has(s.slug)).length;
      const sameAuthor = b.author === self.author ? 1 : 0;
      return { b, score: shared * 2 + sameAuthor };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.b.myRating - a.b.myRating);

  const picks = scored.slice(0, count).map((x) => x.b);
  // pad from crowd-pleasers if thin
  if (picks.length < count) {
    for (const b of crowdPleasers()) {
      if (picks.length >= count) break;
      if (b.id !== id && !picks.some((p) => p.id === b.id)) picks.push(b);
    }
  }
  return picks.map((b) => ({ id: b.id, title: b.title, author: b.author }));
}

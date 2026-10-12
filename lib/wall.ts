// Shared wall filter/sort logic. Used by both the wall grid (Wall.tsx) and the
// book modal, so prev/next in the modal walks the exact same filtered+sorted set
// the user is looking at. Filters live entirely in the URL query string, so this
// is a pure function of (books, params).
import type { WallBook } from "./library";

// Length buckets by page count. Single-select.
export const LENGTHS: {
  key: string;
  label: string;
  test: (p: number) => boolean;
}[] = [
  { key: "short", label: "Short", test: (p) => p <= 250 },
  { key: "medium", label: "Medium", test: (p) => p > 250 && p <= 425 },
  { key: "long", label: "Long", test: (p) => p > 425 && p <= 575 },
  { key: "project", label: "Projects", test: (p) => p > 575 },
];

export type WallParams = {
  shelf: string[];
  genre: string[];
  length: string;
  sort: string;
  q?: string; // free-text search over title + author
};

export function readWallParams(sp: URLSearchParams): WallParams {
  const list = (k: string) => (sp.get(k) ?? "").split(",").filter(Boolean);
  return {
    shelf: list("shelf"),
    genre: list("genre"),
    length: sp.get("length") ?? "",
    sort: sp.get("sort") ?? "",
    q: sp.get("q") ?? "",
  };
}

// Lowercase, drop accents and punctuation, so "bronte" finds "Brontë" and
// "dont" finds "Don't".
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Every word typed has to show up somewhere in the title or author.
export function searchWords(q: string | undefined): string[] {
  return q ? norm(q).split(" ").filter(Boolean) : [];
}

const sortTitle = (t: string) => t.replace(/^(the|a|an)\s+/i, "").toLowerCase();

// Filter (within-category OR, across-category AND) then sort. Returns a new array.
export function orderWall(books: WallBook[], p: WallParams): WallBook[] {
  const lengthDef = LENGTHS.find((l) => l.key === p.length);
  const words = searchWords(p.q);
  const filtered = books.filter((b) => {
    if (words.length) {
      const hay = norm(`${b.title} ${b.author}`);
      if (!words.every((w) => hay.includes(w))) return false;
    }
    if (p.shelf.length && !b.shelfSlugs.some((s) => p.shelf.includes(s)))
      return false;
    if (p.genre.length && !b.genres.some((g) => p.genre.includes(g)))
      return false;
    if (lengthDef && !(b.pages && lengthDef.test(b.pages))) return false;
    return true;
  });
  const arr = [...filtered];
  if (p.sort === "pub")
    arr.sort(
      (a, b) => (b.yearPublished ?? -Infinity) - (a.yearPublished ?? -Infinity),
    );
  else if (p.sort === "title")
    arr.sort((a, b) => sortTitle(a.title).localeCompare(sortTitle(b.title)));
  return arr;
}

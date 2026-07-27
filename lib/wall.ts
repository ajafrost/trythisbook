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
};

export function readWallParams(sp: URLSearchParams): WallParams {
  const list = (k: string) => (sp.get(k) ?? "").split(",").filter(Boolean);
  return {
    shelf: list("shelf"),
    genre: list("genre"),
    length: sp.get("length") ?? "",
    sort: sp.get("sort") ?? "",
  };
}

const sortTitle = (t: string) => t.replace(/^(the|a|an)\s+/i, "").toLowerCase();

// Filter (within-category OR, across-category AND) then sort. Returns a new array.
export function orderWall(books: WallBook[], p: WallParams): WallBook[] {
  const lengthDef = LENGTHS.find((l) => l.key === p.length);
  const filtered = books.filter((b) => {
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

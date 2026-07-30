// Tiny per-tab client store for the wall's state, backed by sessionStorage so it
// survives a page reload (and dev hot-reloads) — not just in-memory SPA nav. The
// book URL is intentionally clean (/book/<slug>, no filters), so the modal can't
// read the active filters from the URL; it reads them here instead. We keep two
// things:
//   • the wall's own URL — path (= genre) + query (= shelf/length/sort/view), its
//     complete filter state — so closing a book returns to that exact wall.
//   • the wall's current ordered book slugs (after filter + sort) — so prev/next
//     in the modal steps through the exact set the user is looking at, not the
//     default recently-read order.
// A plain in-memory variable would be wiped by any full reload (including the
// dev server's hot reload), which is exactly when the modal would silently fall
// back to the wrong order — so we persist. Still empty on a truly fresh session
// (new tab, shared /book/<slug> link), where the modal falls back to its
// server-rendered prev/next; there's no sort context to recover in that case.
const URL_KEY = "ttb:wallUrl";
const ORDER_KEY = "ttb:wallOrder";

const store = (): Storage | null =>
  typeof window !== "undefined" ? window.sessionStorage : null;

export const getWallUrl = (): string => store()?.getItem(URL_KEY) || "/";
export const setWallUrl = (href: string): void => {
  store()?.setItem(URL_KEY, href);
};

export const getWallOrder = (): string[] => {
  const raw = store()?.getItem(ORDER_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
export const setWallOrder = (slugs: string[]): void => {
  store()?.setItem(ORDER_KEY, JSON.stringify(slugs));
};

"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Cover from "./Cover";
import FiveStarBadge from "./FiveStarBadge";
import { GENRES, type WallBook } from "@/lib/library";
import { LENGTHS, orderWall } from "@/lib/wall";
import { setWallUrl, setWallOrder } from "@/lib/wallState";

type Props = {
  books: WallBook[];
  shelves: { slug: string; name: string }[];
};

const PAGE = 48; // how many more books each infinite-scroll step reveals

export default function Wall({ books, shelves }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  // The wall's OWN url is its full filter state: genre in the path (/genre/<slug>,
  // a clean static URL) + shelf/length/sort/view in the query. Every filter is
  // STICKY — while a book modal (/book/<slug>, an intentionally filter-free url)
  // is open over the wall, we FREEZE the last wall url so the wall stays filtered
  // underneath and close returns to that exact filtered wall.
  const onBook = pathname.startsWith("/book/");
  const liveHref = `${pathname}${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  const [savedHref, setSavedHref] = useState(() => (onBook ? "/" : liveHref));
  useEffect(() => {
    if (!onBook) setSavedHref(liveHref);
  }, [onBook, liveHref]);
  const effHref = onBook ? savedHref : liveHref;
  // Keep the restore-on-close URL synced only while we're actually on the wall.
  // (Navigating into a book can momentarily reset the derived state, so we must
  // not let that overwrite the wall URL — see captureWall below.)
  useEffect(() => {
    if (!onBook) setWallUrl(effHref);
  }, [effHref, onBook]);

  // ── read filter state from the effective (possibly frozen) wall url ────────
  const eff = new URL(effHref, "http://wall");
  const effPath = eff.pathname;
  const q = eff.searchParams;
  const list = (key: string) => (q.get(key) ?? "").split(",").filter(Boolean);
  const single = (key: string) => q.get(key) ?? "";

  const genre = effPath.startsWith("/genre/")
    ? decodeURIComponent(effPath.slice("/genre/".length))
    : null;
  const wallBase = genre ? `/genre/${genre}` : "/";

  const shelfSel = list("shelf");
  const genreSel = genre ? [genre] : [];
  const lengthSel = single("length"); // "" | short | medium | long | project
  const sort = single("sort"); // "" (recently read) | "pub" | "title"
  const view = single("view") === "list" ? "list" : "covers";

  // Mutate the query and navigate to wallBase?qs (only fires on wall paths).
  const setParams = useCallback(
    (mut: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(q.toString());
      mut(p);
      const qs = p.toString();
      router.replace(qs ? `${wallBase}?${qs}` : wallBase, { scroll: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, wallBase, effHref]
  );

  // Genre is single-select and drives the path. Selecting the active genre
  // again clears it (back to "/"); other filters (query params) are preserved.
  const setGenre = (slug: string) => {
    const base = genre === slug ? "/" : `/genre/${slug}`;
    const qs = q.toString();
    router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
  };

  const toggleInList = (key: string, val: string) =>
    setParams((p) => {
      const cur = (p.get(key) ?? "").split(",").filter(Boolean);
      const next = cur.includes(val)
        ? cur.filter((v) => v !== val)
        : [...cur, val];
      next.length ? p.set(key, next.join(",")) : p.delete(key);
    });

  const toggleSingle = (key: string, val: string) =>
    setParams((p) => {
      p.get(key) === val ? p.delete(key) : p.set(key, val);
    });

  const setView = (v: string) =>
    setParams((p) => (v === "covers" ? p.delete("view") : p.set("view", v)));

  const setSort = (v: string) =>
    setParams((p) => (v ? p.set("sort", v) : p.delete("sort")));

  // Each book has one clean, canonical URL — no filter query is ever appended,
  // however you reached it. Opening a book therefore doesn't carry the wall's
  // active filter; closing returns to the (unfiltered) wall at "/".
  const bookHref = (slug: string) => `/book/${slug}`;

  // Clear drops genre (→ base "/"), shelf and length; sort/view are kept.
  const clearAll = () => {
    const p = new URLSearchParams(params.toString());
    ["shelf", "length"].forEach((k) => p.delete(k));
    const qs = p.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  };

  // ── filter + sort (shared with the book modal via lib/wall) ────────────────
  const filterKey = `${shelfSel.join(",")}|${genreSel.join(",")}|${lengthSel}`;
  const sorted = useMemo(
    () =>
      orderWall(books, {
        shelf: shelfSel,
        genre: genreSel,
        length: lengthSel,
        sort,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [books, filterKey, sort]
  );

  // Snapshot the wall's exact current URL + filtered/sorted order at the moment a
  // cover is clicked, so an open book modal can step prev/next through that same
  // set. We capture on click (not via an effect) because navigating into a book
  // can momentarily reset the wall's derived filter state — capturing here, while
  // we're provably still on the filtered wall, is what makes the filter "stick".
  const captureWall = useCallback(() => {
    setWallUrl(liveHref);
    setWallOrder(sorted.map((b) => b.slug));
  }, [liveHref, sorted]);

  const anyFilter = shelfSel.length || genreSel.length || lengthSel;

  // ── infinite scroll: reveal PAGE more as the sentinel nears the viewport ────
  const [visible, setVisible] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => setVisible(PAGE), [filterKey, view, sort]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting)
          setVisible((v) => Math.min(v + PAGE, sorted.length));
      },
      { rootMargin: "800px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sorted.length]);
  const shown = sorted.slice(0, visible);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 lg:h-fit lg:w-60 lg:shrink-0">
          <div className="scroll-slim lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-lg font-semibold text-ink">
                What are you in the mood for?
              </h2>
            </div>
            <p className="mt-1 font-mono text-sm font-medium text-accent-deep">
              {sorted.length} book{sorted.length === 1 ? "" : "s"} match
              {anyFilter ? "" : " (all of them)"}
            </p>
            {anyFilter ? (
              <button
                onClick={clearAll}
                className="mt-1 text-xs text-ink-faint underline hover:text-ink"
              >
                Clear filters
              </button>
            ) : null}

            <FilterGroup title="Shelves" collapseOnMobile>
              {shelves.map((s) => (
                <Chip
                  key={s.slug}
                  on={shelfSel.includes(s.slug)}
                  onClick={() => toggleInList("shelf", s.slug)}
                >
                  {s.name}
                </Chip>
              ))}
            </FilterGroup>

            <FilterGroup title="Genre" defaultOpen={false}>
              {GENRES.map((g) => (
                <Chip
                  key={g.slug}
                  on={genreSel.includes(g.slug)}
                  onClick={() => setGenre(g.slug)}
                >
                  {g.label}
                </Chip>
              ))}
            </FilterGroup>

            <FilterGroup title="Length" defaultOpen={false}>
              {LENGTHS.map((l) => (
                <Chip
                  key={l.key}
                  on={lengthSel === l.key}
                  onClick={() => toggleSingle("length", l.key)}
                >
                  {l.label}
                </Chip>
              ))}
            </FilterGroup>
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-ink-soft">
                <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">
                  Sort
                </span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="rounded-full border border-ink/15 bg-canvas px-3 py-1 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <option value="">Recently read</option>
                  <option value="pub">Publication date</option>
                  <option value="title">Title (A–Z)</option>
                </select>
              </label>
              <div className="flex rounded-full border border-ink/15 bg-canvas p-0.5">
                <button
                  onClick={() => setView("covers")}
                  className={`rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider ${
                    view === "covers" ? "bg-accent text-canvas" : "text-ink-soft"
                  }`}
                >
                  Covers
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider ${
                    view === "list" ? "bg-accent text-canvas" : "text-ink-soft"
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          {sorted.length === 0 ? (
            <EmptyState onClear={clearAll} />
          ) : view === "covers" ? (
            <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {shown.map((b, i) => (
                <Link
                  key={b.id}
                  href={bookHref(b.slug)}
                  scroll={false}
                  onClick={captureWall}
                  className="group relative block aspect-[2/3] overflow-hidden rounded-md shadow-[0_6px_18px_-8px_rgba(43,38,32,0.45)] ring-1 ring-black/5 transition-transform hover:-translate-y-1"
                  aria-label={`Open ${b.title}`}
                >
                  <Cover
                    id={b.id}
                    title={b.title}
                    author={b.author}
                    coverUrl={b.coverUrl}
                    className="h-full w-full"
                    // Above-the-fold rows: load eagerly (not lazy) so the LCP
                    // cover isn't deferred; prioritize the very first few.
                    priority={i < 12}
                    fetchPriority={i < 6 ? "high" : undefined}
                  />
                  {b.myRating === 5 && <FiveStarBadge />}
                </Link>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {shown.map((b) => (
                <li key={b.id}>
                  <Link
                    href={bookHref(b.slug)}
                    scroll={false}
                    onClick={captureWall}
                    aria-label={`Open ${b.title}`}
                    className="group -mx-3 flex gap-4 rounded-lg px-3 py-4 transition-colors hover:bg-surface"
                  >
                    <div className="relative h-24 w-16 shrink-0 rounded shadow ring-1 ring-black/10">
                      <div className="h-full w-full overflow-hidden rounded">
                        <Cover
                          id={b.id}
                          title={b.title}
                          author={b.author}
                          coverUrl={b.coverUrl}
                          className="h-full w-full text-[0.55rem]"
                        />
                      </div>
                      {b.myRating === 5 && <FiveStarBadge />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block font-serif text-lg font-semibold leading-snug text-ink group-hover:text-accent-deep">
                        {b.title}
                      </span>
                      <p className="text-sm text-ink-soft">
                        {b.author}
                        {b.yearPublished ? ` · ${b.yearPublished}` : ""}
                      </p>
                      {b.blurb && (
                        <p className="mt-1 text-sm text-ink-soft line-clamp-4">
                          {b.blurb}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* infinite-scroll sentinel */}
          {shown.length < sorted.length && (
            <div ref={sentinel} className="py-8 text-center text-sm text-ink-faint">
              Loading more…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  children,
  defaultOpen = true,
  collapseOnMobile = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  // When true, the group is collapsed below the `lg` breakpoint but open on
  // desktop — until the user toggles it, after which their choice wins on
  // both. Done with CSS classes so there's no hydration flash.
  collapseOnMobile?: boolean;
}) {
  // null = untouched (use the responsive default); true/false = user's choice.
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const touched = userOpen !== null;

  const contentClass = !touched
    ? collapseOnMobile
      ? "hidden lg:flex"
      : defaultOpen
        ? "flex"
        : "hidden"
    : userOpen
      ? "flex"
      : "hidden";

  const chevronClass = !touched
    ? collapseOnMobile
      ? "-rotate-90 lg:rotate-0"
      : defaultOpen
        ? ""
        : "-rotate-90"
    : userOpen
      ? ""
      : "-rotate-90";

  const toggle = () => {
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches;
    const current = touched
      ? (userOpen as boolean)
      : collapseOnMobile && isMobile
        ? false
        : defaultOpen;
    setUserOpen(!current);
  };

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={touched ? (userOpen as boolean) : defaultOpen}
        className="flex w-full items-center justify-between font-mono text-xs font-semibold uppercase tracking-wider text-ink-faint transition-colors hover:text-ink-soft"
      >
        {title}
        <svg
          width="11"
          height="11"
          viewBox="0 0 10 10"
          aria-hidden
          className={`transition-transform duration-200 ${chevronClass}`}
        >
          <path
            d="M2 3.5 5 6.5 8 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className={`mt-2 flex-col gap-1.5 ${contentClass}`}>{children}</div>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`w-full rounded-lg border px-3 py-1.5 text-left text-sm transition-colors ${
        on
          ? "border-accent bg-accent text-canvas"
          : "border-ink/15 bg-canvas text-ink-soft hover:border-accent/50"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white/40 px-6 py-16 text-center">
      <p className="font-serif text-xl text-ink">
        Nothing matches all of that (even I have limits).
      </p>
      <p className="mt-2 text-ink-soft">
        Try dropping a filter, or{" "}
        <a href="/shelves" className="text-accent-deep underline">
          browse the shelves
        </a>
        .
      </p>
      <button
        onClick={onClear}
        className="mt-4 rounded-full bg-sand px-4 py-2 text-sm font-medium text-ink hover:bg-sand-deep"
      >
        Clear all filters
      </button>
    </div>
  );
}

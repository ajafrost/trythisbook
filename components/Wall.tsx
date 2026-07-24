"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cover from "./Cover";
import BookOverlay from "./BookOverlay";
import { GENRES, type WallBook } from "@/lib/library";

type Props = {
  books: WallBook[];
  shelves: { slug: string; name: string }[];
};

const PAGE = 48; // how many more books each infinite-scroll step reveals

// Length buckets by page count. Single-select.
const LENGTHS: { key: string; label: string; test: (p: number) => boolean }[] = [
  { key: "short", label: "Short", test: (p) => p <= 250 },
  { key: "medium", label: "Medium", test: (p) => p > 250 && p <= 425 },
  { key: "long", label: "Long", test: (p) => p > 425 && p <= 575 },
  { key: "project", label: "Projects", test: (p) => p > 575 },
];

export default function Wall({ books, shelves }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  // ── read filter state from the URL (deep-linkable) ─────────────────────────
  const list = (key: string) =>
    (params.get(key) ?? "").split(",").filter(Boolean);
  const single = (key: string) => params.get(key) ?? "";

  const shelfSel = list("shelf");
  const genreSel = list("genre");
  const lengthSel = single("length"); // "" | short | medium | long | project
  const sort = single("sort"); // "" (recently read) | "pub" | "title"
  const view = single("view") === "list" ? "list" : "covers";
  const openId = single("book");

  const setParams = useCallback(
    (mut: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(params.toString());
      mut(p);
      const qs = p.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [params, router]
  );

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

  const openBook = (id: string) => setParams((p) => p.set("book", id));
  const closeBook = () => setParams((p) => p.delete("book"));

  const clearAll = () =>
    setParams((p) => {
      ["shelf", "genre", "length"].forEach((k) => p.delete(k));
    });

  // ── facets ─────────────────────────────────────────────────────────────────
  const shelfName = useMemo(
    () => Object.fromEntries(shelves.map((s) => [s.slug, s.name])),
    [shelves]
  );

  // ── filtering (within-category OR, across-category AND) ────────────────────
  const filterKey = `${shelfSel.join(",")}|${genreSel.join(",")}|${lengthSel}`;
  const filtered = useMemo(() => {
    const lengthDef = LENGTHS.find((l) => l.key === lengthSel);
    return books.filter((b) => {
      if (shelfSel.length && !b.shelfSlugs.some((s) => shelfSel.includes(s)))
        return false;
      if (genreSel.length && !b.genres.some((g) => genreSel.includes(g)))
        return false;
      if (lengthDef && !(b.pages && lengthDef.test(b.pages))) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, filterKey]);

  const anyFilter = shelfSel.length || genreSel.length || lengthSel;

  // ── sorting ────────────────────────────────────────────────────────────────
  const sortTitle = (t: string) => t.replace(/^(the|a|an)\s+/i, "").toLowerCase();
  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sort === "pub")
      arr.sort(
        (a, b) => (b.yearPublished ?? -Infinity) - (a.yearPublished ?? -Infinity)
      );
    else if (sort === "title")
      arr.sort((a, b) => sortTitle(a.title).localeCompare(sortTitle(b.title)));
    return arr;
  }, [filtered, sort]);

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

  // ── overlay state ──────────────────────────────────────────────────────────
  const openIndex = sorted.findIndex((b) => b.id === openId);
  const openBookObj =
    openIndex >= 0 ? sorted[openIndex] : books.find((b) => b.id === openId);

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
            <p className="mt-1 text-sm font-medium text-accent-deep">
              {filtered.length} book{filtered.length === 1 ? "" : "s"} match
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
                  onClick={() => toggleInList("genre", g.slug)}
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
                <span className="text-ink-faint">Sort</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="rounded-full border border-line bg-white/60 px-3 py-1 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <option value="">Recently read</option>
                  <option value="pub">Publication date</option>
                  <option value="title">Title (A–Z)</option>
                </select>
              </label>
              <div className="flex rounded-full border border-line bg-white/60 p-0.5 text-sm">
                <button
                  onClick={() => setView("covers")}
                  className={`rounded-full px-3 py-1 ${
                    view === "covers" ? "bg-accent text-white" : "text-ink-soft"
                  }`}
                >
                  Covers
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`rounded-full px-3 py-1 ${
                    view === "list" ? "bg-accent text-white" : "text-ink-soft"
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState onClear={clearAll} />
          ) : view === "covers" ? (
            <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {shown.map((b) => (
                <button
                  key={b.id}
                  onClick={() => openBook(b.id)}
                  className="group relative block aspect-[2/3] overflow-hidden rounded-md shadow-[0_6px_18px_-8px_rgba(43,38,32,0.45)] ring-1 ring-black/5 transition-transform hover:-translate-y-1"
                  aria-label={`Open ${b.title}`}
                >
                  <Cover
                    id={b.id}
                    title={b.title}
                    author={b.author}
                    coverUrl={b.coverUrl}
                    className="h-full w-full"
                  />
                </button>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {shown.map((b) => (
                <li key={b.id} className="flex gap-4 py-4">
                  <button
                    onClick={() => openBook(b.id)}
                    className="h-24 w-16 shrink-0 overflow-hidden rounded shadow ring-1 ring-black/10"
                    aria-label={`Open ${b.title}`}
                  >
                    <Cover
                      id={b.id}
                      title={b.title}
                      author={b.author}
                      coverUrl={b.coverUrl}
                      className="h-full w-full text-[0.55rem]"
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => openBook(b.id)}
                      className="text-left font-serif text-lg font-semibold leading-snug text-ink hover:text-accent-deep"
                    >
                      {b.title}
                    </button>
                    <p className="text-sm text-ink-soft">{b.author}</p>
                    {b.blurb && (
                      <p className="mt-1 text-sm text-ink-soft line-clamp-4">
                        {b.blurb}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* infinite-scroll sentinel */}
          {shown.length < filtered.length && (
            <div ref={sentinel} className="py-8 text-center text-sm text-ink-faint">
              Loading more…
            </div>
          )}
        </div>
      </div>

      {openBookObj && (
        <BookOverlay
          book={openBookObj}
          shelfNames={shelfName}
          hasPrev={openIndex > 0}
          hasNext={openIndex >= 0 && openIndex < sorted.length - 1}
          onPrev={() => openBook(sorted[openIndex - 1].id)}
          onNext={() => openBook(sorted[openIndex + 1].id)}
          onClose={closeBook}
          onShelf={(slug) =>
            setParams((p) => {
              p.delete("book");
              p.set("shelf", slug);
            })
          }
        />
      )}
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
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-faint transition-colors hover:text-ink-soft"
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
          ? "border-accent bg-accent text-white"
          : "border-line bg-white/60 text-ink-soft hover:border-accent/40"
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

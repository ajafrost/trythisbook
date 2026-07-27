"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cover from "./Cover";
import BookCard from "./BookCard";
import { genreLabel, bookPath, type Book } from "@/lib/library";

// Book detail as a modal over the wall. Rendered by app/(wall)/book/[slug], which
// shares its layout with the wall — so the wall stays mounted behind it. The URL
// is always the clean /book/<slug> (no filter query), so this looks and behaves
// the same whether you clicked in, refreshed, or opened a shared link. Closing
// returns to the wall at "/"; content is server-rendered for search/AI crawlers.
export default function BookOverlay({
  book,
  blurb,
  genres,
  shelves,
  comps,
  prevHref,
  nextHref,
}: {
  book: Book;
  blurb?: string;
  genres: string[];
  shelves: { slug: string; name: string }[];
  comps: { book: Book; blurb?: string }[];
  prevHref: string | null;
  nextHref: string | null;
}) {
  const router = useRouter();
  const close = () => router.push("/");
  const readYear = book.dateRead ? book.dateRead.slice(0, 4) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft" && prevHref) router.push(prevHref);
      else if (e.key === "ArrowRight" && nextHref) router.push(nextHref);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevHref, nextHref]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label={`${book.title} by ${book.author}`}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl animate-pop-in overflow-y-auto rounded-t-2xl bg-paper p-5 shadow-2xl sm:rounded-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-line/60"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="mx-auto w-32 shrink-0 sm:mx-0 sm:w-40">
            <div className="aspect-[2/3] overflow-hidden rounded-md shadow-lg ring-1 ring-black/10">
              <Cover
                id={book.id}
                title={book.title}
                author={book.author}
                coverUrl={book.coverUrl}
                className="h-full w-full"
                priority
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl font-semibold leading-tight text-ink">
              {book.title}
            </h1>
            <p className="mt-0.5 text-ink-soft">{book.author}</p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
              <span className="text-accent-deep">
                {"★".repeat(book.myRating)}
              </span>
              {book.yearPublished && (
                <span>· Published {book.yearPublished}</span>
              )}
              {book.pages && <span>· {book.pages} pages</span>}
              {readYear && <span>· read {readYear}</span>}
            </div>

            {blurb && (
              <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
                {blurb}
              </p>
            )}

            {genres.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {genres.map((g) => (
                  <Link
                    key={g}
                    href={`/genre/${g}`}
                    className="rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent-deep transition-colors hover:bg-accent/20"
                  >
                    {genreLabel(g)}
                  </Link>
                ))}
              </div>
            )}

            {shelves.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {shelves.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/shelves/${s.slug}`}
                    className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-accent/40 hover:text-ink"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            )}

            <a
              href={book.goodreadsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm text-ink-faint underline decoration-line underline-offset-4 hover:text-ink"
            >
              View on Goodreads ↗
            </a>
          </div>
        </div>

        {comps.length > 0 && (
          <section className="mt-8 border-t border-line pt-6">
            <h2 className="font-serif text-lg font-semibold text-ink">
              If you liked this, try…
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-5">
              {comps.map(({ book: b, blurb: cb }) => (
                <BookCard key={b.id} book={b} blurb={cb} href={bookPath(b.id)} />
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
          {prevHref ? (
            <Link
              href={prevHref}
              className="rounded-full px-3 py-1.5 text-sm text-ink-soft hover:bg-line/50"
            >
              ← Previous
            </Link>
          ) : (
            <span className="rounded-full px-3 py-1.5 text-sm text-ink-soft opacity-30">
              ← Previous
            </span>
          )}
          {nextHref ? (
            <Link
              href={nextHref}
              className="rounded-full px-3 py-1.5 text-sm text-ink-soft hover:bg-line/50"
            >
              Next →
            </Link>
          ) : (
            <span className="rounded-full px-3 py-1.5 text-sm text-ink-soft opacity-30">
              Next →
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

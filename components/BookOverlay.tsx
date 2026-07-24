"use client";
import { useEffect } from "react";
import Cover from "./Cover";
import type { WallBook } from "@/lib/library";

// Book detail as an overlay/panel, not a page load (spec 2.4): cover, blurb,
// clickable shelf chips, Goodreads link, and prev/next through the current
// filtered set.
export default function BookOverlay({
  book,
  shelfNames,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  onShelf,
}: {
  book: WallBook;
  shelfNames: Record<string, string>;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onShelf: (slug: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) onPrev();
      else if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [hasPrev, hasNext, onPrev, onNext, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${book.title} by ${book.author}`}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl animate-pop-in overflow-y-auto rounded-t-2xl bg-paper p-5 shadow-2xl sm:rounded-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
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
            <h2 className="font-serif text-2xl font-semibold leading-tight text-ink">
              {book.title}
            </h2>
            <p className="mt-0.5 text-ink-soft">{book.author}</p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
              <span className="text-accent-deep">
                {"★".repeat(book.myRating)}
              </span>
              {book.yearPublished && <span>· {book.yearPublished}</span>}
              {book.pages && <span>· {book.pages} pp</span>}
              {book.readYear && <span>· read {book.readYear}</span>}
            </div>

            {book.blurb && (
              <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
                {book.blurb}
              </p>
            )}

            {book.shelfSlugs.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {book.shelfSlugs.map((slug) => (
                  <button
                    key={slug}
                    onClick={() => onShelf(slug)}
                    className="rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent-deep transition-colors hover:bg-accent/20"
                  >
                    {shelfNames[slug] ?? slug}
                  </button>
                ))}
              </div>
            )}

            <a
              href={book.goodreadsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm text-ink-faint hover:text-ink"
            >
              See it on Goodreads ↗
            </a>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="rounded-full px-3 py-1.5 text-sm text-ink-soft enabled:hover:bg-line/50 disabled:opacity-30"
          >
            ← Previous
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="rounded-full px-3 py-1.5 text-sm text-ink-soft enabled:hover:bg-line/50 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import Cover from "./Cover";
import type { Book } from "@/lib/library";

// The card is the unit everywhere: cover, title, author, and Aja's blurb.
export default function BookCard({
  book,
  blurb,
  onOpen,
  href,
}: {
  book: Book;
  blurb?: string;
  onOpen?: (id: string) => void;
  href?: string;
}) {
  const coverClasses =
    "relative block aspect-[2/3] w-full overflow-hidden rounded-lg bg-canvas shadow-inner ring-1 ring-ink/10 transition-transform duration-200";
  const cover = (
    <>
      <Cover
        id={book.id}
        title={book.title}
        author={book.author}
        coverUrl={book.coverUrl}
        className="h-full w-full"
      />
      {book.myRating === 5 && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-surface-butter px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-ink shadow-sm">
          ★ 5
        </span>
      )}
    </>
  );

  return (
    <div className="group flex flex-col rounded-xl bg-surface p-3">
      {onOpen ? (
        <button
          type="button"
          onClick={() => onOpen(book.id)}
          className={`${coverClasses} cursor-pointer hover:-translate-y-1`}
          aria-label={`Open ${book.title}`}
        >
          {cover}
        </button>
      ) : href ? (
        <Link
          href={href}
          className={`${coverClasses} cursor-pointer hover:-translate-y-1`}
          aria-label={`Open ${book.title}`}
        >
          {cover}
        </Link>
      ) : (
        <div className={coverClasses}>{cover}</div>
      )}

      <div className="mt-2 flex flex-1 flex-col">
        <h3 className="font-serif text-[0.95rem] font-semibold leading-snug text-ink">
          {book.title}
        </h3>
        <p className="font-sans text-xs text-ink-muted">{book.author}</p>

        {blurb && (
          <p className="mt-1.5 font-sans text-sm italic leading-snug text-moss line-clamp-4">
            {blurb}
          </p>
        )}
      </div>
    </div>
  );
}

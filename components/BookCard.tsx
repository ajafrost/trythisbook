"use client";
import Link from "next/link";
import Cover from "./Cover";
import FiveStarBadge from "./FiveStarBadge";
import type { Book } from "@/lib/library";

// The card is the unit everywhere: cover, title, author, and Aja's blurb.
// Blurb truncation. "4" clamps to 4 lines everywhere (default). "none" never
// clamps. "mobile" clamps on small screens but shows the full blurb on desktop —
// for the wide, few "if you liked this" cards, where phones would otherwise get
// very tall, uneven columns.
const BLURB_CLAMP: Record<string, string> = {
  "4": "line-clamp-4",
  none: "",
  mobile: "line-clamp-5 sm:line-clamp-none",
};

export default function BookCard({
  book,
  blurb,
  onOpen,
  href,
  blurbClamp = "4",
  className = "",
}: {
  book: Book;
  blurb?: string;
  onOpen?: (id: string) => void;
  href?: string;
  blurbClamp?: "4" | "none" | "mobile";
  // Extra classes on the card root — e.g. a max-width + mx-auto to shrink and
  // center the card within a wide grid cell.
  className?: string;
}) {
  const coverClasses =
    "relative block aspect-[2/3] w-full overflow-hidden rounded-md shadow-[0_6px_18px_-8px_rgba(43,38,32,0.45)] ring-1 ring-black/5 transition-transform duration-200";
  const cover = (
    <>
      <Cover
        id={book.id}
        title={book.title}
        author={book.author}
        coverUrl={book.coverUrl}
        className="h-full w-full"
      />
      {book.myRating === 5 && <FiveStarBadge />}
    </>
  );

  return (
    <div className={`group flex flex-col ${className}`}>
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
        <p className="text-xs text-ink-soft">{book.author}</p>

        {blurb && (
          <p
            className={`mt-1.5 text-sm leading-snug text-ink-soft ${BLURB_CLAMP[blurbClamp]}`}
          >
            {blurb}
          </p>
        )}
      </div>
    </div>
  );
}

"use client";
import BookCard from "./BookCard";
import type { Book } from "@/lib/library";

export type CardData = {
  book: Book;
  blurb?: string;
};

// Responsive grid of book cards. Covers link into the wall overlay so any card
// can flip you into the full browse experience.
export default function CardGrid({
  items,
  onOpen,
  linkToWall = true,
}: {
  items: CardData[];
  onOpen?: (id: string) => void;
  linkToWall?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map(({ book, blurb }) => (
        <BookCard
          key={book.id}
          book={book}
          blurb={blurb}
          onOpen={onOpen}
          href={!onOpen && linkToWall ? `/?book=${book.id}` : undefined}
        />
      ))}
    </div>
  );
}

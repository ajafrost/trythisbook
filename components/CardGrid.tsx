"use client";
import BookCard from "./BookCard";
import { bookPath, type Book } from "@/lib/library";

export type CardData = {
  book: Book;
  blurb?: string;
};

// Responsive grid of book cards. Covers link to each book's page (/book/<slug>),
// which opens as a modal in-app and a full page on direct load.
export default function CardGrid({
  items,
  onOpen,
  linkToPage = true,
}: {
  items: CardData[];
  onOpen?: (id: string) => void;
  linkToPage?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map(({ book, blurb }) => (
        <BookCard
          key={book.id}
          book={book}
          blurb={blurb}
          onOpen={onOpen}
          href={!onOpen && linkToPage ? bookPath(book.id) : undefined}
        />
      ))}
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import Cover from "@/components/Cover";
import { GENRES, genreBooks } from "@/lib/library";

export const metadata: Metadata = {
  title: "Browse by genre",
  description:
    "Every genre in Aja's library — literary fiction, memoir, mystery, sci-fi, and more. All books rated 4 or 5 stars.",
  alternates: { canonical: "/genre" },
};

export default function GenreIndexPage() {
  // Only genres that actually have loved books, most-stocked first.
  const populated = GENRES.map((g) => ({ ...g, books: genreBooks(g.slug) }))
    .filter((g) => g.books.length > 0)
    .sort((a, b) => b.books.length - a.books.length);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl animate-fade-up">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Browse by genre
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          Pick a lane. Every book here is one I rated 4 or 5 stars.
        </p>
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {populated.map((g) => {
          const covers = g.books.slice(0, 5);
          return (
            <Link
              key={g.slug}
              href={`/genre/${g.slug}`}
              className="group flex flex-col justify-between rounded-xl border border-line bg-white/40 p-5 transition-colors hover:border-accent/40 hover:bg-white/70"
            >
              <h2 className="font-serif text-xl font-semibold text-ink group-hover:text-accent-deep">
                {g.label}
              </h2>
              <div className="mt-4 flex items-end gap-2">
                <div className="flex -space-x-3">
                  {covers.map((b) => (
                    <div
                      key={b.id}
                      className="h-16 w-11 overflow-hidden rounded-sm shadow-md ring-1 ring-black/10"
                    >
                      <Cover
                        id={b.id}
                        title={b.title}
                        author={b.author}
                        coverUrl={b.coverUrl}
                        className="h-full w-full text-[0.55rem]"
                      />
                    </div>
                  ))}
                </div>
                <span className="ml-auto text-xs font-medium text-ink-faint">
                  {g.books.length} books →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

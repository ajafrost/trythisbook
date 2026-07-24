import Link from "next/link";
import type { Metadata } from "next";
import { shelves, shelfBooks } from "@/lib/library";
import Cover from "@/components/Cover";

export const metadata: Metadata = {
  title: "Shelves",
  description:
    "Browsable collections from Aja's library — page-turners, campus novels, short but devastating, and more.",
};

export default function ShelvesPage() {
  const populated = shelves.filter((s) => shelfBooks(s.slug).length > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl animate-fade-up">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Shelves
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          Collections I actually reach for when someone asks what to read. Pick
          a mood and dig in.
        </p>
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {populated.map((shelf) => {
          const books = shelfBooks(shelf.slug).slice(0, 5);
          return (
            <Link
              key={shelf.slug}
              href={`/shelves/${shelf.slug}`}
              className="group flex flex-col justify-between rounded-xl border border-line bg-white/40 p-5 transition-colors hover:border-accent/40 hover:bg-white/70"
            >
              <div>
                <h2 className="font-serif text-xl font-semibold text-ink group-hover:text-accent-deep">
                  {shelf.name}
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {shelf.description}
                </p>
              </div>
              <div className="mt-4 flex items-end gap-2">
                <div className="flex -space-x-3">
                  {books.map((b) => (
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
                  {shelfBooks(shelf.slug).length} books →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

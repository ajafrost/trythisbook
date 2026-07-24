import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { shelves, getShelf, shelfBooks, getBlurb } from "@/lib/library";
import CardGrid, { CardData } from "@/components/CardGrid";

export function generateStaticParams() {
  return shelves.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const shelf = getShelf(slug);
  if (!shelf) return { title: "Shelf not found" };
  return { title: shelf.name, description: shelf.description };
}

export default async function ShelfPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shelf = getShelf(slug);
  if (!shelf) notFound();

  const books = shelfBooks(slug);
  if (books.length === 0) notFound();

  const cardData = (ids: typeof books): CardData[] =>
    ids.map((book) => ({
      book,
      blurb: getBlurb(book.id),
    }));

  // Author-grouped rendering for "Authors who never let me down" (spec 1.4)
  const grouped = shelf.groupByAuthor
    ? groupByAuthor(books)
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="animate-fade-up">
        <Link
          href="/shelves"
          className="text-sm text-ink-faint hover:text-ink"
        >
          ← All shelves
        </Link>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          {shelf.name}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">
          {shelf.description}
        </p>
        <p className="mt-2 text-sm text-ink-faint">{books.length} books</p>
        {shelf.needsReview && (
          <p className="mt-4 inline-block rounded-md bg-accent/10 px-3 py-1.5 text-xs text-accent-deep">
            Draft shelf — Aja hasn&apos;t done her edit pass yet.
          </p>
        )}
      </div>

      <div className="mt-10">
        {grouped ? (
          <div className="space-y-12">
            {grouped.map(({ author, books: authorBooks }) => (
              <section key={author}>
                <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">
                  {author}
                </h2>
                <CardGrid items={cardData(authorBooks)} />
              </section>
            ))}
          </div>
        ) : (
          <CardGrid items={cardData(books)} />
        )}
      </div>
    </div>
  );
}

function groupByAuthor<T extends { author: string }>(books: T[]) {
  const map = new Map<string, T[]>();
  for (const b of books) {
    const arr = map.get(b.author) ?? [];
    arr.push(b);
    map.set(b.author, arr);
  }
  return [...map.entries()]
    .map(([author, books]) => ({ author, books }))
    .sort((a, b) => b.books.length - a.books.length);
}

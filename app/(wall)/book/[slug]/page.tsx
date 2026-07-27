import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookOverlay from "@/components/BookOverlay";
import JsonLd from "@/components/JsonLd";
import {
  getBook,
  getBlurb,
  bookGenres,
  bookShelves,
  compsFor,
  shelfBooks,
  genreLabel,
  bookPath,
  bookIdFromSlug,
  allBookSlugs,
  excerpt,
  wallData,
  type Book,
} from "@/lib/library";
import { bookJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";

// Pre-render every loved book at build time (~687 static pages).
export function generateStaticParams() {
  return allBookSlugs().map((slug) => ({ slug }));
}

function resolve(slug: string): Book | undefined {
  const id = bookIdFromSlug(slug);
  return id ? getBook(id) : undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = resolve(slug);
  if (!book) return { title: "Book not found" };

  const blurb = getBlurb(book.id);
  const description = blurb
    ? excerpt(blurb, 155)
    : `${book.title} by ${book.author} — one Aja read and rated ${book.myRating} stars.`;
  const canonical = bookPath(book.id);

  return {
    title: `${book.title} by ${book.author}`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${book.title} by ${book.author}`,
      description,
      type: "book",
      url: canonical,
      ...(book.coverUrl ? { images: [{ url: book.coverUrl }] } : {}),
    },
  };
}

export default async function BookModalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = resolve(slug);
  if (!book) notFound();

  const blurb = getBlurb(book.id);
  const genres = bookGenres(book.id);
  const shelves = bookShelves(book.id).filter(
    (s) => shelfBooks(s.slug).length > 0,
  );
  const comps = compsFor(book.id, 5)
    .map((c) => getBook(c.id))
    .filter((b): b is Book => !!b)
    .map((b) => ({ book: b, blurb: getBlurb(b.id) }));

  // Prev/next walk the full wall order (recently read). The book URL stays a
  // clean /book/<slug> with no filter query, so this is the same everywhere.
  const order = wallData().books;
  const idx = order.findIndex((b) => b.slug === slug);
  const prevHref = idx > 0 ? bookPath(order[idx - 1].id) : null;
  const nextHref =
    idx >= 0 && idx < order.length - 1 ? bookPath(order[idx + 1].id) : null;

  return (
    <>
      <JsonLd data={bookJsonLd(book, blurb, genres)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "All books", path: "/" },
          ...(genres[0]
            ? [{ name: genreLabel(genres[0]), path: `/genre/${genres[0]}` }]
            : []),
          { name: book.title, path: bookPath(book.id) },
        ])}
      />
      <BookOverlay
        book={book}
        blurb={blurb}
        genres={genres}
        shelves={shelves}
        comps={comps}
        prevHref={prevHref}
        nextHref={nextHref}
      />
    </>
  );
}

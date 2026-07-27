import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookCard from "@/components/BookCard";
import JsonLd from "@/components/JsonLd";
import {
  GENRES,
  genreBooks,
  genreLabel,
  getBlurb,
  bookPath,
} from "@/lib/library";
import { genreCollectionJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";

// One static page per genre (14 total). These map to real search + AI queries
// ("best romance novels"), unlike arbitrary filter combos.
export function generateStaticParams() {
  return GENRES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!GENRES.some((g) => g.slug === slug)) return { title: "Genre not found" };
  const label = genreLabel(slug);
  const count = genreBooks(slug).length;
  const description = `${count} ${label.toLowerCase()} books Aja read and rated 4 or 5 stars — with a one-line take on each.`;
  return {
    title: `${label} books`,
    description,
    alternates: { canonical: `/genre/${slug}` },
  };
}

export default async function GenrePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!GENRES.some((g) => g.slug === slug)) notFound();

  const label = genreLabel(slug);
  const books = genreBooks(slug);
  if (books.length === 0) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <JsonLd data={genreCollectionJsonLd(slug, books)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "All books", path: "/" },
          { name: "Genres", path: "/genre" },
          { name: label, path: `/genre/${slug}` },
        ])}
      />

      <div className="animate-fade-up">
        <Link href="/genre" className="text-sm text-ink-faint hover:text-ink">
          ← All genres
        </Link>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          {label}
        </h1>
        <p className="mt-3 text-sm text-ink-faint">
          {books.length} book{books.length === 1 ? "" : "s"} Aja rated 4 or 5
          stars
        </p>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {books.map((b) => (
          <BookCard
            key={b.id}
            book={b}
            blurb={getBlurb(b.id)}
            href={bookPath(b.id)}
          />
        ))}
      </div>
    </div>
  );
}

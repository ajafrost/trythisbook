import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { GENRES, genreBooks, genreLabel } from "@/lib/library";
import { genreCollectionJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";

// /genre/<slug> IS the wall (from the shared (wall) layout) filtered to one
// genre — a clean static URL for a real search/AI query ("best romance novels"),
// same UI as the wall. This page adds only the SEO signals; the visible grid,
// filtering, and the "N books match" count all come from the persistent <Wall>,
// which reads the active genre from the path.
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

export default async function GenreWallPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!GENRES.some((g) => g.slug === slug)) notFound();
  const books = genreBooks(slug);
  if (books.length === 0) notFound();

  return (
    <>
      <JsonLd data={genreCollectionJsonLd(slug, books)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "All books", path: "/" },
          { name: "Genres", path: "/genre" },
          { name: genreLabel(slug), path: `/genre/${slug}` },
        ])}
      />
    </>
  );
}

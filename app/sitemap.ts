import type { MetadataRoute } from "next";
import {
  lovedBooks,
  GENRES,
  shelves,
  shelfBooks,
  genreBooks,
  bookPath,
} from "@/lib/library";
import { SITE_URL } from "@/lib/site";

// Static sitemap listing only the canonical, indexable pages — books, genres,
// shelves, and the core routes. Filter-permutation query URLs are deliberately
// left out (they canonicalize to their base page).
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const push = (path: string, priority: number) =>
    entries.push({ url: `${SITE_URL}${path}`, priority });

  push("/", 1);
  push("/ask", 0.6);
  push("/shelves", 0.7);
  push("/genre", 0.7);
  push("/about", 0.5);

  for (const g of GENRES) {
    if (genreBooks(g.slug).length > 0) push(`/genre/${g.slug}`, 0.7);
  }
  for (const s of shelves) {
    if (shelfBooks(s.slug).length > 0) push(`/shelves/${s.slug}`, 0.6);
  }
  for (const b of lovedBooks) push(bookPath(b.id), 0.8);

  return entries;
}

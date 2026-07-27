// JSON-LD builders. Structured data is the main lever for AEO here: it lets
// Google and AI answer engines parse "this is a book, by X, in these genres,
// that Aja recommends because Z" cleanly. Emitted via <JsonLd> on each page.
import { SITE_URL, SITE_NAME, absolute } from "./site";
import { bookPath, genreLabel, type Book } from "./library";

const PERSON_ID = `${SITE_URL}/#aja`;
const WEBSITE_ID = `${SITE_URL}/#website`;

// Aja as a schema.org Person — the taste behind every rec. Site-wide identity.
export const ajaPerson = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: "Aja Frost",
  url: "https://ajafrost.com",
  sameAs: [
    "https://ajafrost.com",
    "https://platonicloveletter.substack.com/",
  ],
};

// Site-wide WebSite + Person graph. Rendered once, in the root layout.
export const websiteGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      name: SITE_NAME,
      url: SITE_URL,
      description:
        "Every book here is one Aja actually read and rated 4 or 5 stars.",
      inLanguage: "en",
      author: { "@id": PERSON_ID },
      publisher: { "@id": PERSON_ID },
    },
    ajaPerson,
  ],
};

// A single Book with Aja's blurb nested as a Review (her rating = reviewRating).
export function bookJsonLd(
  book: Book,
  blurb: string | undefined,
  genreSlugs: string[],
): Record<string, unknown> {
  const url = absolute(bookPath(book.id));
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Book",
    "@id": `${url}#book`,
    name: book.title,
    author: { "@type": "Person", name: book.author },
    url,
    isPartOf: { "@id": WEBSITE_ID },
  };
  if (book.coverUrl) data.image = absolute(book.coverUrl);
  if (book.isbn13) data.isbn = book.isbn13;
  if (book.pages) data.numberOfPages = book.pages;
  if (book.yearPublished) data.datePublished = String(book.yearPublished);
  if (genreSlugs.length) data.genre = genreSlugs.map(genreLabel);
  if (book.goodreadsUrl) data.sameAs = book.goodreadsUrl;
  if (blurb) {
    data.review = {
      "@type": "Review",
      reviewBody: blurb,
      author: { "@id": PERSON_ID },
      itemReviewed: { "@id": `${url}#book` },
      reviewRating: {
        "@type": "Rating",
        ratingValue: book.myRating,
        bestRating: 5,
        worstRating: 1,
      },
    };
  }
  return data;
}

// A genre page as a CollectionPage wrapping an ordered ItemList of books.
export function genreCollectionJsonLd(
  slug: string,
  books: Book[],
): Record<string, unknown> {
  const url = absolute(`/genre/${slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    name: `${genreLabel(slug)} — books Aja loved`,
    url,
    isPartOf: { "@id": WEBSITE_ID },
    about: genreLabel(slug),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: books.length,
      itemListElement: books.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absolute(bookPath(b.id)),
        name: b.title,
      })),
    },
  };
}

export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absolute(it.path),
    })),
  };
}

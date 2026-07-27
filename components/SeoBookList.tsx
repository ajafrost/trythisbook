import { bookPath } from "@/lib/library";

// A crawlable, no-JS fallback list of book links. The visible grid is rendered
// client-side by <Wall/> (it reads filters from the URL), so non-JS crawlers
// would otherwise see only the "Loading…" shell. This lives in <noscript>: it
// gives those bots the full set of internal links to the static /book pages,
// while JS clients (incl. Googlebot's renderer) use the live wall — no
// duplicate content.
export default function SeoBookList({
  books,
  heading,
}: {
  books: { id: string; title: string; author: string }[];
  heading: string;
}) {
  return (
    <noscript>
      <nav aria-label={heading} className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h2 className="font-serif text-lg text-ink">{heading}</h2>
        <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => (
            <li key={b.id}>
              <a href={bookPath(b.id)} className="text-ink underline">
                {b.title} — {b.author}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </noscript>
  );
}

// Bookshop.org affiliate links. The ID is public (it only appears in the URL),
// so it lives here as a constant. Affiliate deep link format:
//   https://bookshop.org/a/<AFFILIATE_ID>/<ISBN13>
const AFFILIATE_ID = "103898"; // Aja's Bookshop.org affiliate ID

function isbn10to13(i: string): string {
  const core = "978" + i.slice(0, 9);
  let sum = 0;
  for (let k = 0; k < 12; k++) sum += Number(core[k]) * (k % 2 ? 3 : 1);
  return core + String((10 - (sum % 10)) % 10);
}

// Normalize whatever's in the (mislabeled) isbn13 field to a real ISBN-13.
function isbn13Of(raw?: string): string | undefined {
  const c = (raw ?? "").replace(/[^0-9Xx]/g, "");
  if (c.length === 13 && /^97[89]/.test(c)) return c;
  if (c.length === 10) return isbn10to13(c);
  return undefined;
}

/** A Bookshop.org link for a book — affiliate deep link when we have an ISBN
 *  (and the affiliate ID is set), otherwise a Bookshop search that keeps the
 *  reader on-brand. */
export function bookshopUrl(book: {
  isbn13?: string;
  title: string;
  author: string;
}): string {
  const isbn = isbn13Of(book.isbn13);
  if (AFFILIATE_ID && isbn) {
    return `https://bookshop.org/a/${AFFILIATE_ID}/${isbn}`;
  }
  const q = encodeURIComponent(`${book.title} ${book.author}`.trim());
  return `https://bookshop.org/search?keywords=${q}`;
}

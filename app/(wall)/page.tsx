import { wallData } from "@/lib/library";
import SeoBookList from "@/components/SeoBookList";

// "/" — the interactive wall lives in the shared (wall) layout so it can persist
// underneath book modals. This page adds only a crawlable, no-JS list of every
// book (in <noscript>) so non-JS bots get real content instead of the wall's
// "Loading…" shell.
export default function Home() {
  const { books } = wallData();
  return <SeoBookList books={books} heading="Every book Aja recommends" />;
}

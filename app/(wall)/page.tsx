import type { Metadata } from "next";
import { wallData } from "@/lib/library";
import SeoBookList from "@/components/SeoBookList";

const DESCRIPTION =
  "Discover your next five-star novel, romance, memoir, or mystery/thriller. Aja reads hundreds of books per year and shares her recommendations.";

export const metadata: Metadata = {
  // `absolute` skips the "%s · Try This Book" title template.
  title: { absolute: "Try This Book: Short & sweet book reviews from Aja Frost." },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Try This Book: Short & sweet book reviews from Aja Frost.",
    description: DESCRIPTION,
    type: "website",
  },
};

// "/" — the interactive wall lives in the shared (wall) layout so it can persist
// underneath book modals. This page adds only a crawlable, no-JS list of every
// book (in <noscript>) so non-JS bots get real content instead of the wall's
// "Loading…" shell.
export default function Home() {
  const { books } = wallData();
  return <SeoBookList books={books} heading="Every book Aja recommends" />;
}

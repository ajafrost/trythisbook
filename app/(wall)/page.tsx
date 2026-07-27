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

// Render "/" dynamically so the wall's useSearchParams resolves server-side and
// the grid is server-rendered into the HTML (fast LCP, crawlable) instead of the
// "Loading…" client shell. Genre/book pages don't set this, so they stay static.
export const dynamic = "force-dynamic";

// "/" — the interactive wall lives in the shared (wall) layout so it can persist
// underneath book modals.
export default function Home() {
  const { books } = wallData();
  return <SeoBookList books={books} heading="Every book Aja recommends" />;
}

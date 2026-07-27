import { Suspense } from "react";
import { wallData } from "@/lib/library";
import Wall from "@/components/Wall";

// Shared layout for the wall ("/") and every book modal ("/book/[slug]"). The
// <Wall/> is rendered HERE, not in the page, so it stays mounted — keeping its
// scroll position and filter state — as you move between the two. A book URL is
// therefore the same wall with that book's modal (the child page) layered on
// top, whether you clicked into it, refreshed, or opened a shared link.
export default function WallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { books, shelves } = wallData();
  return (
    <>
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-16 text-ink-faint sm:px-6">
            Loading the shelves…
          </div>
        }
      >
        <Wall books={books} shelves={shelves} />
      </Suspense>
      {children}
    </>
  );
}

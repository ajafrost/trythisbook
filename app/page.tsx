import { Suspense } from "react";
import { wallData } from "@/lib/library";
import Wall from "@/components/Wall";

// Homepage IS the library wall — the full 4–5★ collection, browsable.
export default function Home() {
  const { books, shelves } = wallData();
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16 text-ink-faint sm:px-6">
          Loading the shelves…
        </div>
      }
    >
      <Wall books={books} shelves={shelves} />
    </Suspense>
  );
}

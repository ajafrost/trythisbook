import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Who Aja is and how Try This Book works.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <img
        src="/about-aja.jpg"
        alt="Aja talking books with friends at a pop-up event"
        className="aspect-[3/2] w-full rounded-xl object-cover shadow-sm"
      />

      <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink-soft">
        <p>
          Hi, I&apos;m Aja. I read a lot (usually 100+ books a year) — and have
          a lot of opinions about which books are worth the time. Enter: this
          website.
        </p>
        <p>
          Every single book here is one I&apos;ve rated 4 or 5 stars. You can{" "}
          <Link
            href="/"
            className="text-accent-deep underline underline-offset-2"
          >
            browse everything I recommend
          </Link>{" "}
          and filter by mood, length, and genre, or{" "}
          <Link
            href="/ask"
            className="text-accent-deep underline underline-offset-2"
          >
            get a custom rec
          </Link>{" "}
          by describing what you&apos;re looking for.
        </p>
        <p>Thanks for stopping by!</p>
      </div>
    </div>
  );
}

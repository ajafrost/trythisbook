"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "All books" },
  { href: "/genre", label: "Genres" },
  { href: "/shelves", label: "Shelves" },
  { href: "/about", label: "About" },
];

export default function Header() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const askActive = pathname.startsWith("/ask");

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-canvas">
      <div className="mx-auto flex max-w-6xl items-center gap-x-4 px-4 py-3 sm:px-6">
        {/* Wordmark: hidden on mobile to make room for a single-row nav */}
        <Link
          href="/"
          className="hidden font-serif text-2xl font-semibold tracking-tight text-ink whitespace-nowrap sm:block sm:text-3xl"
        >
          Try This Book
        </Link>

        <nav className="flex w-full items-center justify-between gap-x-2 sm:ml-auto sm:w-auto sm:justify-end sm:gap-x-5">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap font-mono text-sm transition-colors ${
                isActive(n.href)
                  ? "text-signal"
                  : "text-ink hover:text-signal"
              }`}
            >
              {n.label}
            </Link>
          ))}

          {/* The AI feature — the standout signal CTA (shortened on mobile) */}
          <Link
            href="/ask"
            className="whitespace-nowrap rounded-full bg-signal px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-canvas transition-colors hover:bg-signal-hover"
          >
            <span className="sm:hidden">Custom recs</span>
            <span className="hidden sm:inline">Get a custom rec</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

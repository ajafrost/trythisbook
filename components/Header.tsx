"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "All books" },
  { href: "/shelves", label: "Shelves" },
  { href: "/about", label: "About" },
];

export default function Header() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const askActive = pathname.startsWith("/ask");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-x-4 px-4 py-3 sm:px-6">
        {/* Wordmark: hidden on mobile to make room for a single-row nav */}
        <Link
          href="/"
          className="hidden font-serif text-2xl font-semibold tracking-tight text-ink whitespace-nowrap sm:block sm:text-3xl"
        >
          Try This Book
        </Link>

        <nav className="flex w-full items-center justify-between gap-x-1 sm:ml-auto sm:w-auto sm:justify-end sm:gap-x-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3.5 sm:text-[0.95rem] ${
                isActive(n.href)
                  ? "bg-accent/10 text-accent-deep"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {n.label}
            </Link>
          ))}

          {/* The AI feature — the standout CTA (shortened label on mobile) */}
          <Link
            href="/ask"
            className={`cta-glow whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold text-ink shadow-sm transition-colors sm:px-4 sm:text-[0.95rem] ${
              askActive ? "bg-sand-deep" : "bg-sand hover:bg-sand-deep"
            }`}
          >
            <span className="sm:hidden">Custom recs</span>
            <span className="hidden sm:inline">Get a custom rec</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

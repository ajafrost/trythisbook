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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-serif text-2xl font-semibold tracking-tight text-ink whitespace-nowrap sm:text-3xl"
        >
          Try This Book
        </Link>

        <nav className="ml-auto flex items-center gap-1 overflow-x-auto sm:gap-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[0.95rem] font-medium transition-colors ${
                isActive(n.href)
                  ? "bg-accent/10 text-accent-deep"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {n.label}
            </Link>
          ))}

          {/* The AI feature — the standout CTA */}
          <Link
            href="/ask"
            className={`cta-glow whitespace-nowrap rounded-full px-4 py-1.5 text-[0.95rem] font-semibold text-ink shadow-sm transition-colors ${
              askActive ? "bg-sand-deep" : "bg-sand hover:bg-sand-deep"
            }`}
          >
            Get a custom rec
          </Link>
        </nav>
      </div>
    </header>
  );
}

import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/Header";

// Mono — for nav details, badges, and CTA labels (Editorial Signal preview).
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

// Display serif — a free stand-in for Larken (the reference site's face):
// high-contrast, elegant, with expressive italics.
const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

// Body/UI — Matter (licensed local font). Only the Regular weight is on hand,
// so heavier UI text (buttons, labels) is synthesized until more weights land.
const sans = localFont({
  src: "./fonts/Matter-Regular.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://trythisbook.com"),
  title: {
    default: "Try This Book",
    template: "%s · Try This Book",
  },
  description:
    "Every book here is one Aja actually read and rated 4 or 5 stars. Browse the whole collection, filter by mood, and track what you've read.",
  openGraph: {
    title: "Try This Book",
    description:
      "Every book here is one Aja actually read and loved. Browse, filter, and track.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="min-h-screen antialiased">
        <Header />
        <main>{children}</main>
        <footer className="mx-auto max-w-6xl border-t border-line px-4 py-10 text-sm text-ink-faint sm:px-6">
          <p className="flex flex-wrap gap-x-5 gap-y-1">
            <a
              href="https://ajafrost.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink"
            >
              Aja&apos;s personal site ↗
            </a>
            <a
              href="https://platonicloveletter.substack.com/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink"
            >
              Platonic Love ↗
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Cover from "@/components/Cover";

type RecPick = {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  goodreadsUrl: string;
  blurb?: string;
  why: string;
};
type RecPayload = { fallback: boolean; message?: string; picks: RecPick[] };

const LOADING_LINES = [
  "flipping through everything I've read…",
  "thinking about what you actually want…",
  "pulling three off the shelf…",
  "narrowing it down…",
];

export default function AskPage() {
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<"input" | "loading" | "result">("input");
  const [result, setResult] = useState<RecPayload | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [line, setLine] = useState(0);

  useEffect(() => {
    if (phase !== "loading") return;
    const t = setInterval(
      () => setLine((n) => (n + 1) % LOADING_LINES.length),
      1400
    );
    return () => clearInterval(t);
  }, [phase]);

  async function go(query: string) {
    const q = query.trim();
    if (!q) return;
    setPhase("loading");
    setLastQuery(q);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: q }),
      });
      setResult((await res.json()) as RecPayload);
    } catch {
      setResult({
        fallback: true,
        message: "Something broke on my end. Try browsing the shelves instead?",
        picks: [],
      });
    }
    setPhase("result");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <header className="text-center">
        <h1 className="font-serif text-5xl font-normal tracking-tight text-ink sm:text-6xl">
          Tell me what you&apos;re{" "}
          <em className="italic text-accent-deep">in the mood</em> for
        </h1>
        <p className="mt-4 text-lg text-ink-soft">
          Describe it however you like — a vibe, a comparison, a constraint —
          and I&apos;ll pull three books off my shelves for you.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        className="mt-8"
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) go(value);
          }}
          placeholder="e.g. a twisty thriller I can finish in a weekend, or something like The Secret History…"
          rows={3}
          maxLength={500}
          className="w-full resize-none rounded-2xl border border-line bg-white px-5 py-4 text-lg text-ink shadow-sm placeholder:text-ink-faint focus:border-accent focus:outline-none"
          aria-label="Describe what you're looking for"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-ink-faint">⌘/Ctrl + Enter</span>
          <button
            type="submit"
            disabled={!value.trim() || phase === "loading"}
            className="rounded-full bg-sand px-6 py-3 font-medium text-ink transition-colors hover:bg-sand-deep disabled:opacity-40"
          >
            {phase === "loading" ? "Thinking…" : "Find me three"}
          </button>
        </div>
      </form>

      {phase === "loading" && (
        <div className="mt-10 flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((d) => (
              <span
                key={d}
                className="h-2.5 w-2.5 animate-pop-in rounded-full bg-accent"
                style={{ animationDelay: `${d * 0.15}s` }}
              />
            ))}
          </div>
          <p className="font-serif text-lg text-ink-soft">
            {LOADING_LINES[line]}
          </p>
        </div>
      )}

      {phase === "result" && result && (
        <div className="mt-10 animate-fade-up">
          {result.fallback && result.message && (
            <p className="mb-4 rounded-lg bg-accent/10 px-4 py-2.5 text-sm text-accent-deep">
              {result.message}
            </p>
          )}
          <div className="space-y-4">
            {result.picks.map((p, i) => (
              <div
                key={p.id}
                className="flex gap-4 rounded-2xl border border-line bg-white/60 p-4 shadow-sm sm:p-5"
              >
                <div className="w-20 shrink-0 sm:w-24">
                  <div className="aspect-[2/3] overflow-hidden rounded-md shadow-md ring-1 ring-black/10">
                    <Cover
                      id={p.id}
                      title={p.title}
                      author={p.author}
                      coverUrl={p.coverUrl}
                      className="h-full w-full"
                      priority={i === 0}
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-serif text-xl font-semibold leading-tight text-ink">
                    {p.title}
                  </h2>
                  <p className="text-sm text-ink-soft">{p.author}</p>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-ink">
                    {p.why}
                  </p>
                  <a
                    href={p.goodreadsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs text-ink-faint hover:text-ink"
                  >
                    Goodreads ↗
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => go(lastQuery)}
              className="rounded-full bg-sand px-5 py-2.5 font-medium text-ink hover:bg-sand-deep"
            >
              Try again
            </button>
            <button
              onClick={() => {
                setPhase("input");
                setResult(null);
                setValue("");
              }}
              className="rounded-full border border-line bg-white px-5 py-2.5 font-medium text-ink hover:border-accent/40"
            >
              New search
            </button>
            <Link
              href="/"
              className="rounded-full px-5 py-2.5 font-medium text-ink-soft hover:text-ink"
            >
              Browse all books
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

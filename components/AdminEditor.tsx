"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type EditorBook = {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  myRating: number;
  blurb: string;
  needsReview: boolean;
  hasReview: boolean;
};

export default function AdminEditor({ books }: { books: EditorBook[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [onlyAttention, setOnlyAttention] = useState(false);

  const attentionCount = books.filter(
    (b) => !b.blurb || b.needsReview
  ).length;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return books.filter((b) => {
      // A search always looks across every book, ignoring the attention filter.
      if (needle) {
        return (
          b.title.toLowerCase().includes(needle) ||
          b.author.toLowerCase().includes(needle)
        );
      }
      if (onlyAttention && b.blurb && !b.needsReview) return false;
      return true;
    });
  }, [books, q, onlyAttention]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-serif text-3xl font-semibold text-ink">
          Blurb editor
        </h1>
        <button
          onClick={logout}
          className="font-mono text-xs uppercase tracking-wider text-ink-faint hover:text-signal"
        >
          Log out
        </button>
      </div>
      <p className="mt-1 font-mono text-sm text-ink-soft">
        {books.length} books
        {attentionCount > 0 && (
          <span className="text-accent-deep">
            {" · "}
            {attentionCount} need review
          </span>
        )}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title or author…"
          className="flex-1 rounded-xl border border-ink/15 bg-canvas px-4 py-2.5 text-ink placeholder:text-ink-muted/60 focus:border-ink focus:outline-none"
        />
        <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink-soft">
          <input
            type="checkbox"
            checked={onlyAttention}
            onChange={(e) => setOnlyAttention(e.target.checked)}
          />
          Needs attention only
        </label>
      </div>

      <p className="mt-3 font-mono text-xs text-ink-faint">
        Saving commits to the site and goes live after a short redeploy (~1–2 min).
      </p>

      <div className="mt-4 divide-y divide-ink/10">
        {shown.map((b) => (
          <Row key={b.id} book={b} />
        ))}
        {shown.length === 0 && (
          <p className="py-10 text-center text-ink-soft">Nothing to show.</p>
        )}
      </div>
    </div>
  );
}

function Row({ book }: { book: EditorBook }) {
  const [text, setText] = useState(book.blurb);
  const [needsReview, setNeedsReview] = useState(book.needsReview);
  const [savedText, setSavedText] = useState(book.blurb);
  const [savedReview, setSavedReview] = useState(book.needsReview);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [msg, setMsg] = useState("");

  const dirty = text !== savedText || needsReview !== savedReview;

  async function save() {
    setStatus("saving");
    setMsg("");
    try {
      const res = await fetch("/api/admin/save-blurb", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: book.id,
          title: book.title,
          text,
          needsReview,
        }),
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setStatus("error");
        setMsg(error || `Save failed (${res.status}).`);
        return;
      }
      setSavedText(text);
      setSavedReview(needsReview);
      setStatus("saved");
      setMsg("Saved — live in ~1–2 min.");
    } catch (e) {
      setStatus("error");
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="flex gap-4 py-5">
      {book.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverUrl}
          alt=""
          className="h-20 w-[3.4rem] shrink-0 rounded object-cover shadow ring-1 ring-ink/10"
        />
      ) : (
        <div className="h-20 w-[3.4rem] shrink-0 rounded bg-surface ring-1 ring-ink/10" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h2 className="font-serif text-lg font-semibold leading-tight text-ink">
            {book.title}
          </h2>
          <span className="font-mono text-xs text-accent-deep">
            {"★".repeat(book.myRating)}
          </span>
        </div>
        <p className="text-sm text-ink-muted">{book.author}</p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={
            book.hasReview
              ? "No blurb — currently falling back to the Goodreads review. Write one to override."
              : "No blurb yet — write one."
          }
          className="mt-2 w-full resize-none rounded-xl border border-ink/15 bg-canvas px-3 py-2 text-[0.95rem] text-ink placeholder:text-ink-muted/60 focus:border-ink focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink-soft">
            <input
              type="checkbox"
              checked={needsReview}
              onChange={(e) => setNeedsReview(e.target.checked)}
            />
            Needs review
          </label>
          <button
            onClick={save}
            disabled={!dirty || status === "saving"}
            className="rounded-lg bg-ink px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-canvas transition-colors hover:bg-signal disabled:cursor-not-allowed disabled:opacity-30"
          >
            {status === "saving" ? "Saving…" : "Save"}
          </button>
          {msg && (
            <span
              className={`text-xs ${
                status === "error" ? "text-signal" : "text-moss"
              }`}
            >
              {msg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

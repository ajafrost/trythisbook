# Try This Book — project handoff

A snapshot of where the project stands, so a new session (or a new person) can pick up cleanly.

## What it is
**Try This Book** (trythisbook.com) — Aja Frost's personal book-recommendation site. Every book is one she read and rated 4 or 5 stars. **Browse-first**: a filterable wall of covers + curated shelves, plus one AI feature ("Get a custom rec"). No accounts, no tracking.

- **Stack:** Next.js 15 (App Router) + TypeScript + Tailwind, deploy target Vercel.
- **Location:** the app lives in the **`trythisbook/`** subfolder of `01 Projects/Book Recs/`. Source book data (the Goodreads CSV, cover images, newsletter PDFs) sits in the parent `Book Recs/` folder.
- **Scope note:** the original spec had a mood quiz + "if you liked X". Those were **removed**; the site is now browse-first with a single free-text AI rec page.

## Pages
| Route | What it is |
|---|---|
| `/` | The library wall — all 4–5★ books. Sidebar filters (Shelves / Genre / Length, collapsible), Sort dropdown, Covers/List toggle, infinite scroll, detail overlay. Deep-linkable (`/?shelf=…&genre=…&sort=…`). |
| `/shelves`, `/shelves/[slug]` | The 13 curated shelves. |
| `/ask` | **"Get a custom rec"** — free-text box → Claude returns 3 matched picks. Server-side, validated against the library. |
| `/about` | Short about page. |
| `/api/recommend` | The AI endpoint (Haiku, tool-use structured output, IP rate limit, cache, crowd-pleasers fallback). |
| `/api/sync` | RSS sync stub (cron-protected). Not central. |

## Current numbers
- **690 loved books** (4–5★), all shown on the wall.
- **Covers: 690/690** — every book has one. Mostly Open Library, ~150 are Aja's own uploads in `public/covers/` (named `<bookId>.<ext>`).
- **Blurbs: 690/690** — every book has a description. 28 are Aja's verbatim (from her newsletters), the rest AI-drafted (flagged `needsReview`).
- **Genres: 690/690** classified into 1–2 of 14 genres.

## The data layer (all committed, read as-is at build)
`npm run build` does **NOT** regenerate these — edit them directly or via the scripts below.

| File | What / who owns it |
|---|---|
| `data/library.json` | Generated from `goodreads_export.csv`. One record per read book. Holds `coverUrl` (incl. local `/covers/…`). **Don't hand-edit for bulk**; use scripts. Re-running `build-library` preserves covers. |
| `data/curation.json` | The 13 shelves + per-book blurbs. Aja's to maintain. `build-curation` preserves blurbs on re-run but resets shelf lists. |
| `data/genres.json` | `{ bookId: [genre-slugs] }`. Durable, not regenerated. |
| `data/removed.json` | `{ ids: [...], authors: [...] }` — books/authors excluded everywhere. `build-library` respects it, so removals survive regeneration. |

## Common edit workflows (how the current session did them)
- **Add/replace covers:** drop image files in `Book Covers/` (parent folder), named after the book title (multi-word ok). Then a script matches filename→book, copies into `public/covers/<id>.<ext>`, and sets `coverUrl`. Filenames with apostrophes/subtitles/typos sometimes need a manual wire by book id. **Uploaded covers always override Open Library ones.**
- **Remove books:** add the Goodreads Book Id to `data/removed.json` `ids` (or an author name to `authors`), then filter it out of `library.json` + `curation.json`. Match carefully — short titles like "Wild"/"Legend" need exact matching so you don't nuke "Wild Swans".
- **After ANY data change, restart the dev server.** Next.js caches imported JSON, so `library.json`/`curation.json`/`genres.json` edits don't hot-reload — stop and `npm run dev` again, or you'll see stale data. (Non-issue on real builds.)

## Design system (modeled on slowdowncreative.com)
- **Palette** (`tailwind.config.ts`): warm-white ground `#fbf9f1`, soft near-black ink `#2c2a26`, muted apricot accent `#c0784c`, powder-blue second `#9fbecd`, decorative peach `#f2d6b3`.
- **Type** (`app/layout.tsx`): **Fraunces** (display serif, with italic emphasis) + **Hanken Grotesk** (body) — free stand-ins for the reference's commercial **Larken** + **Matter**. Aja may buy those webfonts later; swap via `next/font/local` (~10-min change).
- Cover placeholders (`lib/color.ts`) use soft pastels — but all 690 have real covers now, so they rarely show.

## The AI feature — cost
- Needs `ANTHROPIC_API_KEY` in `.env.local` (already set locally; gitignored). Without it, `/ask` falls back to crowd-pleasers gracefully.
- Model: `claude-haiku-4-5`, ~½¢ per rec. Guardrails: 10 recs/hr/IP (in-memory, soft on Vercel), request cache, prompt-cached catalog.
- **Aja set a $10/month hard cap** in the Anthropic Console — the reliable ceiling.

## Run / deploy
```bash
cd trythisbook
npm install
npm run dev          # http://localhost:3000
npm run build        # uses committed data
```
Deploy: push `trythisbook/` to a Git repo → import in Vercel → set `ANTHROPIC_API_KEY` (and optional `GOODREADS_RSS_URL`, `CRON_SECRET`) → point trythisbook.com at it.

## Open / possible next items
- **Copy pass:** shelf names/descriptions, About, and AI-drafted blurbs are flagged for Aja's edit pass.
- **Real fonts:** swap Fraunces/Hanken → Larken/Matter if purchased.
- **Genre spot-fixes:** the 690 genre tags are auto-classified; some may be debatable.
- **Not built:** the Top-10-of-the-year scroll page (spec v1.1), any real Goodreads live sync (build-time only for now).
- **Remaining covers/blurbs:** none missing — the set is complete as of this handoff.

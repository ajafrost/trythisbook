# Try This Book

A personal book site — every book is one Aja actually read and rated 4 or 5 stars. Browse the whole collection, filter by mood/length/era, dig into curated shelves, and track what you've read. Built with Next.js + Tailwind. No accounts, no backend, no AI guessing — just her taste.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — see below
npm run data                 # builds data/library.json + data/curation.json from the CSV
npm run covers               # (optional) fetch real cover images for the library
npm run dev                  # http://localhost:3000
```

## Pages

| Route | What it is |
|---|---|
| `/` | The whole wall — every 4–5★ book, NPR-style filters, covers/list toggle, detail overlay. Deep-linkable (`/?shelf=page-turners&length=short`). |
| `/shelves`, `/shelves/[slug]` | Curated collections. |
| `/my-list` | Your want-to-read list + reading score (client-side). |
| `/about` | Who Aja is, how it works. |

## Environment variables

| Var | What it's for |
|---|---|
| `GOODREADS_RSS_URL` | Aja's "read" shelf RSS feed, merged in at build time. Copy the exact URL from the RSS icon at the bottom of your Goodreads shelf page. Optional — the site works from the CSV alone. |
| `CRON_SECRET` | Shared secret protecting `/api/sync`. Vercel sends it automatically as `Authorization: Bearer <secret>` when the env var is set. |

## How the data works

**Both JSON files are committed and used as-is at build time** — `npm run build` does NOT regenerate them (so covers and blurbs are never wiped). Regenerate manually only when Aja's library changes.

- **`data/library.json`** — generated, don't hand-edit. Built by `scripts/build-library.ts` from `goodreads_export.csv` (+ the RSS feed if configured). `scripts/fetch-covers.ts` enriches it with real cover images from Open Library. Re-running `npm run data` **preserves** existing cover URLs.
- **`data/curation.json`** — Aja's to maintain. The 13 shelves and per-book blurbs. `scripts/build-curation.ts` generated a **starter** version with every shelf pre-populated (flagged `needsReview`) and 635 blurbs drafted in Aja's voice. Re-running `npm run data` **preserves** existing blurbs but **resets the shelf lists** to the starter — so once Aja hand-picks shelves, edit `curation.json` directly rather than re-running.

To refresh from a new Goodreads export: drop the new CSV in as `goodreads_export.csv`, then `npm run data && npm run covers`. Blurbs and covers for existing books carry over.

### Daily auto-sync of newly-loved books

`.github/workflows/goodreads-sync.yml` runs once a day and adds any book Aja has **newly rated 4 or 5 stars** on Goodreads to the site — no CSV re-export needed. It runs `npm run sync` (`scripts/sync-goodreads.ts`), which reads the Goodreads "read" shelf RSS feed, appends only 4–5★ books not already in `data/library.json` (skipping anything in `data/removed.json`), fetches a cover for each, and commits the updated `library.json`. That push triggers a fresh Vercel deploy, so new books go live on their own. If nothing new is loved, the job is a clean no-op.

The sync is **purely additive** — it never rewrites `curation.json` (so hand-picked shelves are safe) and never removes existing books, so it's safe to run forever.

**One-time setup:**
1. Add a repo secret `GOODREADS_RSS_URL` (Settings → Secrets and variables → Actions) — Aja's "read" shelf RSS URL, the same value as `.env.example`.
2. Settings → Actions → General → Workflow permissions → **Read and write permissions**.

You can also trigger it manually from the Actions tab, or run it locally with `GOODREADS_RSS_URL=… npm run sync`.

### Library stats

1,314 read · **736 recommendable (4–5★)** · 256 are 5★.

## Deploy (Vercel)

1. Push this folder to a Git repo, import it in Vercel.
2. Set the env vars above in the Vercel project settings (both optional).
3. Point `trythisbook.com` at the project (Vercel handles SSL).
4. New 4–5★ books are added automatically by the daily GitHub Actions sync (see "Daily auto-sync" above), which commits to the repo and lets Vercel redeploy. `/api/sync` remains available as an optional cron-protected revalidation hook.

## ✍️ Copy flagged for Aja's edit pass

All user-facing copy is a **draft in Aja's voice** — search for `NOTE FOR AJA` and `draft` comments. Shelf names/descriptions, the About page, verdict lines, and blurbs are all yours to rewrite.

## Not built (out of scope / v1.1)

- **AI recommendations** (quiz, "if you liked X") — removed; the site is browse-first.
- **Top 10 countdown** (`/best-of-2026`) — NYT-style scroll set-piece (spec 2.6).

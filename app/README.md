# ReinvyLibrary Website

A warm, "soft scrapbook" reader for [ReinvyLibrary](https://github.com/ReinvyLibrary/ReinvyLibrary) —
the bilingual (EN/ID) collection of tutorials, cheatsheets, guides, and syllabi.

Built with **Next.js (App Router, TypeScript, Tailwind CSS v4)** and auto-synced from the content
repository via **ISR** (Incremental Static Regeneration).

---

## Getting started

```bash
cd website
npm install
cp .env.example .env.local   # optional: adjust GITHUB_REPO / GITHUB_BRANCH
npm run dev                  # http://localhost:3000
```

### Environment variables

| Var | Default | Purpose |
|---|---|---|
| `GITHUB_REPO` | `ReinvyLibrary/ReinvyLibrary` | source content repo (`owner/name`) |
| `GITHUB_BRANCH` | `main` | branch to sync from |
| `GITHUB_TOKEN` | — | optional PAT (raises API rate limit 60→5000 req/hr) |
| `ISR_REVALIDATE` | `300` | revalidate window in seconds |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | canonical/OG base URL |
| `USE_LOCAL_SOURCE` | — | `true` → read content from the repo checkout instead of GitHub |

### Local dev against the repo checkout

Set `USE_LOCAL_SOURCE=true` in `.env.local`. The app then reads markdown directly from
`../` (the repository root), which is fast and never rate-limited — great for development.

---

## How auto-sync works

1. **File index** — one GitHub *Git Trees API* call (`?recursive=1`), filtered to the content
   directories. Cached with `revalidate`.
2. **Content** — each markdown file is fetched from `raw.githubusercontent.com` (a CDN with no
   API rate limit).
3. **ISR** — every route is statically generated and revalidated every `ISR_REVALIDATE` seconds.
   A push to the repo's branch refreshes the site within that window, with **zero manual deploys**.

**Rate limits:** the whole build needs ~2 API calls (1 tree + 1 repo meta) per revalidate wave.
Unauthenticated (60 req/hr) is fine; a token is optional insurance.

**Offline safety:** if GitHub is unreachable, the site falls back to the checked-in
[`src/lib/fallback-tree.json`](src/lib/fallback-tree.json) snapshot so pages still build and
render, plus scrapbook-themed error states — never a blank page.

Refresh the snapshot after the repo gains content:

```bash
npm run sync:snapshot
```

---

## Routes

| Route | Page |
|---|---|
| `/` | locale redirect (`Accept-Language` + cookie) |
| `/en`, `/id` | home — hero search + bento grid |
| `/en/search`, `/id/search` | fuzzy search (FlexSearch, client-side) |
| `/en/backend`, … | category index |
| `/en/backend/expressjs`, … | technology index |
| `/en/frontend/nextjs/tutorials/building-x`, … | document reader |

Document pages: bookmark-tab sidebar (slide-over drawer on mobile), paper reading surface,
scroll-synced TOC, interactive checklists (syllabi), EN↔ID language toggle.
Cheatsheets render as a filterable snippet-card grid.

---

## Design system

**Token rule:** all colors, radii, shadows, and fonts are defined **only** in
[`src/app/globals.css`](src/app/globals.css) (Tailwind v4 `@theme`). Never hardcode hex values
in components — use the generated utilities (`bg-paper`, `text-ink`, `rounded-card`,
`shadow-paper`, …).

- **Palette:** paper `#FAFAF7` · card `#FFFFFF` · ink `#2D3142` · ink-muted `#4C566A` ·
  sticky `#FFF3B0` · peach `#FDE2E4` · sage `#E8F3E8` · line `#E5E5E0` ·
  terracotta `#E07A5F` · eucalyptus `#81B29A` · washi `#F7F3E8`
- **Fonts:** Quicksand (display) · Plus Jakarta Sans (body) · Kalam (hand/marginalia) ·
  JetBrains Mono (code) — via `next/font/google`
- **Details:** rounded cards (16–24px), soft paper shadows, subtle micro-rotations,
  washi-tape accents, sticky-note callouts.
- **No** glassmorphism, brutalist black borders, or pure `#000`.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build (prerenders all routes) |
| `npm start` | serve the production build |
| `npm run lint` | ESLint |
| `npm run sync:snapshot` | refresh the offline fallback tree |

## Roadmap (post-v1)

- Webhook → on-demand `revalidatePath` endpoint (instant refresh instead of the ISR window)
- OG image generation, RSS feed, dark theme

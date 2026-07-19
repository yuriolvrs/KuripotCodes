# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A private Next.js dashboard + scraper framework ("KuripotCodes") that aggregates ride-hailing/delivery promo codes for the Philippines market across five platforms: Grab, Angkas, Move It, inDrive, and JoyRide. It scrapes public sources, normalizes/dedupes results into a `Promo` model, persists them as flat JSON in `data/promos.json` (no database — no Supabase/Firebase/Postgres/Redis/paid APIs), and displays them in a filterable dashboard.

## Commands

```bash
npm install        # install dependencies
npm run dev         # start dev server on http://localhost:3001
npm run build        # production build
npm run lint          # eslint (flat config: next/core-web-vitals + next/typescript)
npm run scrape         # run the scrape pipeline via tsx scripts/scrape.ts
```

There is no test suite and no `test` script — do not assume one exists. There is no CI lint/build workflow; `.github/workflows/scrape.yml` only runs `npm run scrape` on a schedule and auto-commits `data/promos.json`.

## Architecture

**Scrape pipeline** (`lib/pipeline.ts`): loads current promos from `data/promos.json` via `lib/storage.ts`, runs every scraper in `lib/scrapers/` in parallel (`Promise.all`, individual failures are caught and reported, not fatal), merges new results with existing ones via `mergePromos` in `lib/normalize.ts` (dedupes by platform + code, updates `firstSeen`/`lastSeen`), and writes the merged array back to disk. Triggered either via `npm run scrape` (`scripts/scrape.ts`, also used by the CI cron) or via `POST /api/scrape` (`app/api/scrape/route.ts`) from the UI.

**Scraper contract**: every file in `lib/scrapers/` implements the `Scraper` interface from `lib/scrapers/types.ts` (`name`, `run({ now, discoveries })`) and returns raw promo candidates that `lib/normalize.ts` turns into `Promo` objects. Some scrapers use plain `fetch` against public JSON/HTML endpoints; others use `puppeteer`/`puppeteer-extra` with the stealth plugin for pages that need JS rendering. Facebook scraping is intentionally limited to public pages/posts accessible without login. When adding a new source, follow the existing per-file isolation pattern — one scraper failing must not break the others.

**Domain helpers in `lib/`**:
- `types.ts` — `Promo`/`RawPromo`/`Platform`/`DiscountType`/`PromoStatus` — the canonical data model.
- `date.ts` — date parsing and derivation of `status` (active/expired/unknown) and "expiring soon".
- `service.ts` — classifies a promo into a specific service (e.g. GrabFood, GrabCar) per platform via regex rules against title/description.
- `source.ts` — maps a `sourceUrl` hostname to a friendly source-site label used in filtering/display.
- `storage.ts` — the only module that reads/writes `data/promos.json` directly (Node `fs`); also exposes `upsertPromo`/`getActivePromos`.

**API routes**: `app/api/promo/route.ts` handles manual promo creation (POST) and updates to the user-state flags `working`/`used`/`bookmarked` on an existing promo by id (PATCH). `app/api/scrape/route.ts` triggers the pipeline on demand and returns found/saved counts plus per-scraper failures.

**Dashboard** (`components/promo-dashboard.tsx`): owns `FilterState` and derives `filteredPromos` via `useMemo` by filtering the raw `promos` array (platform, service, status, source site, has-code/expiring-soon/bookmarked/used toggles, free-text search over title/code/description/platform/region/source/service). Filter UI lives in `components/filter-sheet.tsx` (right-side drawer) and `components/sidebar.tsx` (left nav: platforms + services + Bookmarked link). Individual results render as `components/promo-card.tsx` in a CSS grid. UI primitives (button, card, badge, select, checkbox, menu, input) live in `components/ui/` as local shadcn/ui-style components — prefer reusing these over introducing a new UI library.

**Path alias**: `@/*` resolves to the project root (see `tsconfig.json`).

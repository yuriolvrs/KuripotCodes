# Philippines Ride-Hailing Promo Aggregator

A private Next.js dashboard and scraper framework for collecting ride-hailing promo codes, vouchers, and discounts in the Philippines.

Target platforms:

- Grab
- Angkas
- Move It
- inDrive
- JoyRide

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- Node.js
- Local JSON storage in `data/promos.json`

No Supabase, Firebase, PostgreSQL, Redis, or paid APIs are used.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

Run the scraper:

```bash
npm run scrape
```

The scrape command loads current records from `data/promos.json`, runs scrapers in parallel, normalizes results into the `Promo` model, deduplicates by platform and code, updates timestamps, and writes the merged file back to disk.

## Project Structure

```text
app/
  page.tsx
components/
  promo-dashboard.tsx
  promo-card.tsx
  ui/
data/
  promos.json
lib/
  normalize.ts
  pipeline.ts
  storage.ts
  types.ts
  scrapers/
scripts/
  scrape.ts
.github/workflows/
  scrape.yml
```

## Scrapers

The scraper interface lives in `lib/scrapers/types.ts`.

Implemented:

- `wethrift.ts`: fetches Wethrift coupon pages, extracts likely promo codes, parses discount and expiry hints, and normalizes results.
- `reddit.ts`: searches public Reddit JSON endpoints for recent posts mentioning ride-hailing promos.
- `grab.ts`: simple official-source scraper for the Grab Philippines blog.

Scaffolded for extension:

- `angkas.ts`
- `moveit.ts`
- `indrive.ts`
- `joyride.ts`
- `couponfollow.ts`
- `facebook.ts`
- `discovery.ts`

Facebook scraping is intentionally limited to public pages/posts that are accessible without login.

## Data Model

```ts
export interface Promo {
  id: string;
  platform: "Grab" | "Angkas" | "Move It" | "inDrive" | "JoyRide" | "Other";
  title: string;
  code: string;
  description?: string;
  discountType?: "percent" | "fixed" | "free_ride" | "unknown";
  discountValue?: string;
  region?: string;
  sourceUrl: string;
  startDate?: string;
  endDate?: string;
  status: "active" | "expired" | "unknown";
  firstSeen: string;
  lastSeen: string;
}
```

## GitHub Actions

`.github/workflows/scrape.yml` runs every 6 hours:

```yaml
schedule:
  - cron: "0 */6 * * *"
```

The workflow installs dependencies, runs `npm run scrape`, commits changes to `data/promos.json`, and pushes them back to the repo.

## Notes

Scraping reliability depends on each source allowing unauthenticated public access. Coupon sites and social platforms can change markup or rate-limit requests, so each scraper is isolated and easy to replace or improve.

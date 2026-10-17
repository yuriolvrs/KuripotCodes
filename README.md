# KuripotCodes

A promo code dashboard for ride-hailing and delivery deals in the Philippines. Scrapers collect codes from public sources, and the dashboard lets you filter them by platform, service, and status.

## Why I built it

Mostly for me and my friends. Discount codes for Grab, Angkas, Foodpanda, and the rest are scattered across coupon sites and Reddit threads, and many of them stop working before you find them. I wanted one place where the working codes are easy to find.

The second reason was to see how far scraping tools have come. It's a good way to find out how much structured data you can pull from public pages with modern tooling, and where it still breaks.

## How it works

- **Scrapers** in `lib/scrapers/` pull codes from coupon sites, Reddit, and platform pages. Each one is isolated, so a single failing source doesn't stop the rest.
- **Pipeline** (`lib/pipeline.ts`) runs them in parallel, normalizes the results, and merges them with what's already stored, deduplicating by platform and code.
- **Storage** is a flat JSON file, `data/promos.json`. There is no database.
- **Scheduling**: a GitHub Actions workflow runs the scraper every 30 minutes and commits any changes to `data/promos.json`.
- **Dashboard** is a Next.js app that filters promos by platform, service, and status, and lets you bookmark codes or mark them as working or used.

Some scrapers use plain `fetch`, and others use Puppeteer with a stealth plugin for pages that need JavaScript to render.

## Running it locally

```bash
npm install
npm run dev
```

Open `http://localhost:3001`. To run the scraper on its own:

```bash
npm run scrape
```

Other commands: `npm run build`, `npm run lint`, `npm run test`, and `npm run cleanup`.

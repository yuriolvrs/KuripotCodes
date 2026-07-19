import { loadPromos, savePromos } from "./storage";
import { mergePromos } from "./normalize";
import type { Promo } from "./types";
import { angkasScraper } from "./scrapers/angkas";
import { couponSitesScraper } from "./scrapers/coupon-sites";
import { grabScraper } from "./scrapers/grab";
import { inDriveScraper } from "./scrapers/indrive";
import { joyRideScraper } from "./scrapers/joyride";
import { moveItScraper } from "./scrapers/moveit";
import { picodiScraper } from "./scrapers/picodi";
import { redditScraper } from "./scrapers/reddit";
import type { Scraper } from "./scrapers/types";
import { wethriftScraper } from "./scrapers/wethrift";

const SCRAPERS: Scraper[] = [
  couponSitesScraper,
  picodiScraper,
  wethriftScraper,
  redditScraper,
  grabScraper,
  angkasScraper,
  moveItScraper,
  inDriveScraper,
  joyRideScraper
];

export const SCRAPER_COUNT = SCRAPERS.length;

export interface ScrapeResult {
  found: Promo[];
  saved: Promo[];
  failures: Array<{ scraper: string; message: string }>;
}

export async function runScrapePipeline(now = new Date()): Promise<ScrapeResult> {
  const settled = await Promise.all(
    SCRAPERS.map(async (scraper) =>
      scraper
        .run({ now })
        .then((promos) => ({ scraper: scraper.name, promos, error: undefined }))
        .catch((error: unknown) => ({
          scraper: scraper.name,
          promos: [],
          error: error instanceof Error ? error.message : String(error)
        }))
    )
  );

  const found: Promo[] = [];
  const failures: ScrapeResult["failures"] = [];

  for (const result of settled) {
    found.push(...result.promos);
    if (result.error) {
      failures.push({ scraper: result.scraper, message: result.error });
    }
  }

  const current = await loadPromos();
  const saved = mergePromos(current, found, now);
  await savePromos(saved);

  return { found, saved, failures };
}

import { loadPromos, savePromos, withStorageLock } from "./storage";
import { mergePromos } from "./normalize";
import type { Promo } from "./types";
import { angkasScraper } from "./scrapers/angkas";
import { couponSitesScraper } from "./scrapers/coupon-sites";
import { foodpandaScraper } from "./scrapers/foodpanda";
import { grabScraper } from "./scrapers/grab";
import { inDriveScraper } from "./scrapers/indrive";
import { ivoucherCodesScraper } from "./scrapers/ivouchercodes";
import { joyRideScraper } from "./scrapers/joyride";
import { lazadaScraper } from "./scrapers/lazada";
import { moveItScraper } from "./scrapers/moveit";
import { picodiScraper } from "./scrapers/picodi";
import { redditScraper } from "./scrapers/reddit";
import { shopeeScraper } from "./scrapers/shopee";
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
  joyRideScraper,
  ivoucherCodesScraper,
  shopeeScraper,
  lazadaScraper,
  foodpandaScraper
];

export const SCRAPER_COUNT = SCRAPERS.length;

export interface ScrapeResult {
  found: Promo[];
  saved: Promo[];
  failures: Array<{ scraper: string; message: string }>;
  counts: Array<{ scraper: string; found: number }>;
  newPromos: number;
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
  const counts: ScrapeResult["counts"] = [];

  for (const result of settled) {
    found.push(...result.promos);
    counts.push({ scraper: result.scraper, found: result.promos.length });
    if (result.error) {
      failures.push({ scraper: result.scraper, message: result.error });
    }
  }

  const { saved, newPromos } = await withStorageLock(async () => {
    const current = await loadPromos();
    const existingIds = new Set(current.map((promo) => promo.id));
    const merged = mergePromos(current, found, now);
    await savePromos(merged);
    return { saved: merged, newPromos: merged.filter((promo) => !existingIds.has(promo.id)).length };
  });

  return { found, saved, failures, counts, newPromos };
}

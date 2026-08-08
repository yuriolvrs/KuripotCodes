import { rawToPromos, uniqueBy } from "./shared";
import { scrapeEverySaving } from "./everysaving";
import type { Scraper } from "./types";

const EVERYSAVING_URL = "https://www.everysaving.ph/shop/foodpanda.com";

export const foodpandaScraper: Scraper = {
  name: "foodpanda",
  async run({ now }) {
    const rawPromos = await scrapeEverySaving(EVERYSAVING_URL, "Foodpanda");

    if (rawPromos.length === 0) {
      throw new Error("All Foodpanda requests failed");
    }

    return rawToPromos(uniqueBy(rawPromos, (promo) => `${promo.platform}:${promo.code || promo.title}:${promo.sourceUrl}`), now);
  }
};

import { rawToPromos, uniqueBy } from "./shared";
import { scrapeEverySaving } from "./everysaving";
import type { Scraper } from "./types";

const EVERYSAVING_URL = "https://www.everysaving.ph/shop/shopee.ph";

export const shopeeScraper: Scraper = {
  name: "shopee",
  async run({ now }) {
    const rawPromos = await scrapeEverySaving(EVERYSAVING_URL, "Shopee");

    if (rawPromos.length === 0) {
      throw new Error("All Shopee requests failed");
    }

    return rawToPromos(uniqueBy(rawPromos, (promo) => `${promo.platform}:${promo.code || promo.title}:${promo.sourceUrl}`), now);
  }
};

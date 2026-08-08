import { rawToPromos, uniqueBy } from "./shared";
import { scrapeEverySaving } from "./everysaving";
import { scrapeWorthPenny } from "./worthepenny";
import type { Scraper } from "./types";

const EVERYSAVING_URL = "https://www.everysaving.ph/shop/lazada.com.ph";
const WORTHEPENNY_URL = "https://lazada.worthepenny.com/coupon/";

export const lazadaScraper: Scraper = {
  name: "lazada",
  async run({ now }) {
    const [everysavingResult, worthepennyResult] = await Promise.allSettled([
      scrapeEverySaving(EVERYSAVING_URL, "Lazada"),
      scrapeWorthPenny(WORTHEPENNY_URL, "Lazada")
    ]);

    const allRawPromos = [
      ...(everysavingResult.status === "fulfilled" ? everysavingResult.value : []),
      ...(worthepennyResult.status === "fulfilled" ? worthepennyResult.value : [])
    ];

    if (allRawPromos.length === 0) {
      throw new Error("All Lazada requests failed");
    }

    return rawToPromos(uniqueBy(allRawPromos, (promo) => `${promo.platform}:${promo.code || promo.title}:${promo.sourceUrl}`), now);
  }
};

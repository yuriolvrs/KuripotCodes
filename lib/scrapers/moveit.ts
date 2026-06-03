import type { RawPromo } from "../types";
import { extractCodes, extractExpiry, fetchText, rawToPromos, stripHtml, titleFromText, uniqueBy } from "./shared";
import { scrapeEverySaving } from "./everysaving";
import { scrapeWorthPenny } from "./worthepenny";
import type { Scraper } from "./types";

const EVERYSAVING_URL = "https://www.everysaving.ph/shop/moveit.com.ph";
const WORTHEPENNY_URL = "https://move-it.worthepenny.com/coupon/";
const OFFICIAL_URL = "https://moveit.com.ph/home/";

function parseOfficialPage(html: string): RawPromo[] {
  const text = stripHtml(html);
  const codes = extractCodes(text);

  return uniqueBy(
    codes.map((code) => ({
      platform: "Move It" as const,
      title: titleFromText("Move It", code, text),
      code,
      description: text.slice(0, 260),
      sourceUrl: OFFICIAL_URL,
      endDate: extractExpiry(text)
    })),
    (promo) => `${promo.platform}:${promo.code}`
  );
}

export const moveItScraper: Scraper = {
  name: "moveit",
  async run({ now }) {
    const [officialResult, everysavingResult, worthepennyResult] = await Promise.allSettled([
      fetchText(OFFICIAL_URL).then((html) => parseOfficialPage(html)),
      scrapeEverySaving(EVERYSAVING_URL, "Move It"),
      scrapeWorthPenny(WORTHEPENNY_URL, "Move It")
    ]);

    const allRawPromos = [
      ...(officialResult.status === "fulfilled" ? officialResult.value : []),
      ...(everysavingResult.status === "fulfilled" ? everysavingResult.value : []),
      ...(worthepennyResult.status === "fulfilled" ? worthepennyResult.value : [])
    ];

    if (allRawPromos.length === 0) {
      throw new Error("All Move It requests failed");
    }

    return rawToPromos(uniqueBy(allRawPromos, (promo) => `${promo.platform}:${promo.code || promo.title}:${promo.sourceUrl}`), now);
  }
};

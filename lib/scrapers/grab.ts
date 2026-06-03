import type { RawPromo } from "../types";
import { extractCodes, extractExpiry, fetchText, rawToPromos, stripHtml, titleFromText, uniqueBy } from "./shared";
import { scrapeWorthPenny } from "./worthepenny";
import type { Scraper } from "./types";

const WORTHEPENNY_URL = "https://grab.worthepenny.com/coupon/";
const OFFICIAL_URL = "https://www.grab.com/ph/blog/";

function parseOfficialPage(html: string): RawPromo[] {
  const text = stripHtml(html);
  const codes = extractCodes(text);

  return uniqueBy(
    codes.map((code) => ({
      platform: "Grab" as const,
      title: titleFromText("Grab", code, text),
      code,
      description: text.slice(0, 260),
      sourceUrl: OFFICIAL_URL,
      endDate: extractExpiry(text)
    })),
    (promo) => `${promo.platform}:${promo.code}`
  );
}

export const grabScraper: Scraper = {
  name: "grab",
  async run({ now }) {
    const [officialResult, worthepennyResult] = await Promise.allSettled([
      fetchText(OFFICIAL_URL).then((html) => parseOfficialPage(html)),
      scrapeWorthPenny(WORTHEPENNY_URL, "Grab")
    ]);

    const allRawPromos = [
      ...(officialResult.status === "fulfilled" ? officialResult.value : []),
      ...(worthepennyResult.status === "fulfilled" ? worthepennyResult.value : [])
    ];

    if (allRawPromos.length === 0) {
      throw new Error("All Grab requests failed");
    }

    return rawToPromos(uniqueBy(allRawPromos, (promo) => `${promo.platform}:${promo.code || promo.title}:${promo.sourceUrl}`), now);
  }
};

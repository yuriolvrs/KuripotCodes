import type { RawPromo } from "../types";
import { extractCodes, extractExpiry, fetchText, rawToPromos, stripHtml, titleFromText, uniqueBy } from "./shared";
import { scrapeEverySaving } from "./everysaving";
import type { Scraper } from "./types";

const EVERYSAVING_URL = "https://www.everysaving.ph/shop/joyride.com.ph";
const OFFICIAL_URL = "https://joyride.com.ph/";

function parseOfficialPage(html: string): RawPromo[] {
  const text = stripHtml(html);
  const codes = extractCodes(text);

  return uniqueBy(
    codes.map((code) => ({
      platform: "JoyRide" as const,
      title: titleFromText("JoyRide", code, text),
      code,
      description: text.slice(0, 260),
      sourceUrl: OFFICIAL_URL,
      endDate: extractExpiry(text)
    })),
    (promo) => `${promo.platform}:${promo.code}`
  );
}

export const joyRideScraper: Scraper = {
  name: "joyride",
  async run({ now }) {
    const [officialResult, everysavingResult] = await Promise.allSettled([
      fetchText(OFFICIAL_URL).then((html) => parseOfficialPage(html)),
      scrapeEverySaving(EVERYSAVING_URL, "JoyRide")
    ]);

    const allRawPromos = [
      ...(officialResult.status === "fulfilled" ? officialResult.value : []),
      ...(everysavingResult.status === "fulfilled" ? everysavingResult.value : [])
    ];

    if (allRawPromos.length === 0) {
      throw new Error("All JoyRide requests failed");
    }

    return rawToPromos(uniqueBy(allRawPromos, (promo) => `${promo.platform}:${promo.code || promo.title}:${promo.sourceUrl}`), now);
  }
};

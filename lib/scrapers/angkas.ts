import { detectPlatform } from "../normalize";
import type { RawPromo } from "../types";
import { extractCodes, extractExpiry, fetchText, rawToPromos, stripHtml, titleFromText, uniqueBy } from "./shared";
import { scrapeEverySaving } from "./everysaving";
import { searchSubredditRss } from "./reddit";
import type { Scraper } from "./types";

const EVERYSAVING_URL = "https://www.everysaving.ph/shop/angkas.com";
const OFFICIAL_URL = "https://www.angkas.com/";

const REDDIT_QUERY = "Angkas promo code voucher";
const REDDIT_SUBREDDITS = ["Philippines", "PHMotorcycles"];

function parseOfficialPage(html: string): RawPromo[] {
  const text = stripHtml(html);
  const codes = extractCodes(text);

  return uniqueBy(
    codes.map((code) => ({
      platform: "Angkas" as const,
      title: titleFromText("Angkas", code, text),
      code,
      description: text.slice(0, 260),
      sourceUrl: OFFICIAL_URL,
      endDate: extractExpiry(text)
    })),
    (promo) => `${promo.platform}:${promo.code}`
  );
}

async function scrapeReddit(): Promise<RawPromo[]> {
  const settled = await Promise.allSettled(
    REDDIT_SUBREDDITS.map((subreddit) => searchSubredditRss(subreddit, REDDIT_QUERY))
  );

  const rawPromos: RawPromo[] = [];

  for (const result of settled) {
    if (result.status !== "fulfilled") continue;

    for (const entry of result.value) {
      const text = [entry.title, entry.content].filter(Boolean).join(" ");
      const platform = detectPlatform(text);
      if (platform !== "Angkas") continue;

      for (const code of extractCodes(text)) {
        rawPromos.push({
          platform: "Angkas",
          title: titleFromText("Angkas", code, text),
          code,
          description: text.slice(0, 260),
          sourceUrl: entry.link || "https://old.reddit.com",
          endDate: extractExpiry(text)
        });
      }
    }
  }

  return rawPromos;
}

export const angkasScraper: Scraper = {
  name: "angkas",
  async run({ now }) {
    const [officialResult, everysavingResult] = await Promise.allSettled([
      fetchText(OFFICIAL_URL).then((html) => parseOfficialPage(html)),
      scrapeEverySaving(EVERYSAVING_URL, "Angkas")
    ]);

    const pagePromos = [
      ...(officialResult.status === "fulfilled" ? officialResult.value : []),
      ...(everysavingResult.status === "fulfilled" ? everysavingResult.value : [])
    ];

    let redditPromos: RawPromo[] = [];
    try {
      redditPromos = await scrapeReddit();
      if (redditPromos.length > 0) {
        console.log(`[angkas] Reddit: ${redditPromos.length} results`);
      }
    } catch {
      console.log("[angkas] Reddit search failed");
    }

    const allRawPromos = [...pagePromos, ...redditPromos];

    if (allRawPromos.length === 0) {
      throw new Error("All Angkas requests failed");
    }

    return rawToPromos(uniqueBy(allRawPromos, (promo) => `${promo.platform}:${promo.code || promo.title}:${promo.sourceUrl}`), now);
  }
};

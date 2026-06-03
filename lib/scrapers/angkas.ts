import { detectPlatform } from "../normalize";
import type { RawPromo } from "../types";
import { extractCodes, extractExpiry, fetchText, rawToPromos, stripHtml, titleFromText, uniqueBy } from "./shared";
import { scrapeEverySaving } from "./everysaving";
import type { Scraper } from "./types";

const EVERYSAVING_URL = "https://www.everysaving.ph/shop/angkas.com";
const OFFICIAL_URL = "https://www.angkas.com/";

const REDDIT_SEARCH_URLS = [
  `https://www.reddit.com/r/Philippines/search.json?q=${encodeURIComponent("Angkas promo code voucher")}&restrict_sr=1&sort=new&t=month&limit=25`,
  `https://www.reddit.com/r/PHMotorcycles/search.json?q=${encodeURIComponent("Angkas promo code voucher")}&restrict_sr=1&sort=new&t=month&limit=25`
];

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

interface RedditListing {
  data?: {
    children?: Array<{
      data?: {
        title?: string;
        selftext?: string;
        url?: string;
        permalink?: string;
        created_utc?: number;
      };
    }>;
  };
}

async function scrapeReddit(): Promise<RawPromo[]> {
  const settled = await Promise.allSettled(REDDIT_SEARCH_URLS.map((url) => fetchText(url)));
  const rawPromos: RawPromo[] = [];
  let successfulRequests = 0;

  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    successfulRequests += 1;

    let listing: RedditListing;
    try {
      listing = JSON.parse(result.value) as RedditListing;
    } catch {
      continue;
    }

    for (const child of listing.data?.children ?? []) {
      const post = child.data;
      if (!post) continue;

      const text = [post.title, post.selftext].filter(Boolean).join(" ");
      const platform = detectPlatform(text);
      if (platform !== "Angkas") continue;

      for (const code of extractCodes(text)) {
        rawPromos.push({
          platform: "Angkas",
          title: titleFromText("Angkas", code, text),
          code,
          description: text.slice(0, 260),
          sourceUrl: post.permalink ? `https://www.reddit.com${post.permalink}` : post.url ?? "https://www.reddit.com",
          endDate: extractExpiry(text)
        });
      }
    }
  }

  if (successfulRequests === 0) return [];
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

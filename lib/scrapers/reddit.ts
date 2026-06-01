import { detectPlatform } from "../normalize";
import type { RawPromo } from "../types";
import { extractCodes, extractExpiry, fetchText, rawToPromos, titleFromText, uniqueBy } from "./shared";
import type { Scraper } from "./types";

const SUBREDDITS = ["Philippines", "PHMotorcycles", "GrabPH"];
const TERMS = ["promo code", "voucher", "discount code"];

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

export const redditScraper: Scraper = {
  name: "reddit",
  async run({ now }) {
    const urls = SUBREDDITS.flatMap((subreddit) =>
      TERMS.map(
        (term) =>
          `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(
            `Grab Angkas "Move It" inDrive JoyRide ${term}`
          )}&restrict_sr=1&sort=new&t=month&limit=25`
      )
    );

    const settled = await Promise.allSettled(urls.map((url) => fetchText(url)));
    const rawPromos: RawPromo[] = [];
    let successfulRequests = 0;

    for (const result of settled) {
      if (result.status !== "fulfilled") continue;
      successfulRequests += 1;

      const listing = JSON.parse(result.value) as RedditListing;
      for (const child of listing.data?.children ?? []) {
        const post = child.data;
        if (!post) continue;

        const text = [post.title, post.selftext].filter(Boolean).join(" ");
        const platform = detectPlatform(text);
        if (platform === "Other") continue;

        for (const code of extractCodes(text)) {
          rawPromos.push({
            platform,
            title: titleFromText(platform, code, text),
            code,
            description: text.slice(0, 260),
            sourceUrl: post.permalink ? `https://www.reddit.com${post.permalink}` : post.url ?? "https://www.reddit.com",
            endDate: extractExpiry(text)
          });
        }
      }
    }

    if (successfulRequests === 0) {
      throw new Error("All Reddit requests failed or were blocked");
    }

    return rawToPromos(uniqueBy(rawPromos, (promo) => `${promo.platform}:${promo.code}:${promo.sourceUrl}`), now);
  }
};

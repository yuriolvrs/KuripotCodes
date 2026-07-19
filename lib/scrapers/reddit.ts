import { detectPlatform } from "../normalize";
import type { RawPromo } from "../types";
import {
  decodeEntities,
  extractCodes,
  extractExpiry,
  fetchText,
  mapWithConcurrency,
  rawToPromos,
  stripHtml,
  titleFromText,
  uniqueBy
} from "./shared";
import type { Scraper } from "./types";

const REQUEST_CONCURRENCY = 2;
const REQUEST_SPACING_MS = 750;

const SUBREDDITS = ["Philippines", "PHMotorcycles", "GrabPH"];
const TERMS = ["promo code", "voucher", "discount code"];

// www.reddit.com/*.json is blocked for unauthenticated requests (403).
// old.reddit.com's Atom search feed remains publicly reachable.
const REDDIT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
  accept: "application/atom+xml, application/rss+xml, application/xml"
};

export interface RedditRssEntry {
  title: string;
  content: string;
  link: string;
}

export function parseRedditRss(xml: string): RedditRssEntry[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

  return entries.map((entry) => {
    const title = decodeEntities(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").trim();
    const rawContent = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] ?? "";
    const content = stripHtml(decodeEntities(rawContent));
    const link = entry.match(/<link href="([^"]*)"/)?.[1] ?? "";
    return { title, content, link };
  });
}

function buildSearchUrl(subreddit: string, query: string) {
  return `https://old.reddit.com/r/${subreddit}/search.rss?q=${encodeURIComponent(
    query
  )}&restrict_sr=1&sort=new&t=month&limit=25`;
}

export async function searchSubredditRss(subreddit: string, query: string): Promise<RedditRssEntry[]> {
  const html = await fetchText(buildSearchUrl(subreddit, query), 15000, REDDIT_HEADERS);
  return parseRedditRss(html);
}

function entriesToRawPromos(entries: RedditRssEntry[], platformFilter?: (p: RawPromo["platform"]) => boolean) {
  const rawPromos: RawPromo[] = [];

  for (const entry of entries) {
    const text = [entry.title, entry.content].filter(Boolean).join(" ");
    const platform = detectPlatform(text);
    if (platform === "Other") continue;
    if (platformFilter && !platformFilter(platform)) continue;

    for (const code of extractCodes(text)) {
      rawPromos.push({
        platform,
        title: titleFromText(platform, code, text),
        code,
        description: text.slice(0, 260),
        sourceUrl: entry.link || "https://old.reddit.com",
        endDate: extractExpiry(text)
      });
    }
  }

  return rawPromos;
}

export const redditScraper: Scraper = {
  name: "reddit",
  async run({ now }) {
    const queries = SUBREDDITS.flatMap((subreddit) =>
      TERMS.map((term) => ({ subreddit, query: `Grab Angkas "Move It" inDrive JoyRide ${term}` }))
    );

    const settled = await mapWithConcurrency(queries, REQUEST_CONCURRENCY, async ({ subreddit, query }) => {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_SPACING_MS));
      return searchSubredditRss(subreddit, query);
    });

    const rawPromos: RawPromo[] = [];
    let successfulRequests = 0;

    for (const result of settled) {
      if (result.status !== "fulfilled") continue;
      successfulRequests += 1;
      rawPromos.push(...entriesToRawPromos(result.value));
    }

    if (successfulRequests === 0) {
      throw new Error("All Reddit requests failed or were blocked");
    }

    return rawToPromos(uniqueBy(rawPromos, (promo) => `${promo.platform}:${promo.code}:${promo.sourceUrl}`), now);
  }
};

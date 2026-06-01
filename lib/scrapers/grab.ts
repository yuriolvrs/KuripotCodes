import type { Scraper } from "./types";
import { scrapeOfficialPages } from "./official-pages";

const TARGETS = [{ platform: "Grab" as const, url: "https://www.grab.com/ph/blog/" }];

export const grabScraper: Scraper = {
  name: "grab",
  async run({ now }) {
    return scrapeOfficialPages(TARGETS, now);
  }
};

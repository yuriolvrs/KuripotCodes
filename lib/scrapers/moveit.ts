import type { Scraper } from "./types";
import { scrapeOfficialPages } from "./official-pages";

const TARGETS = [{ platform: "Move It" as const, url: "https://moveit.com.ph/home/" }];

export const moveItScraper: Scraper = {
  name: "moveit",
  async run({ now }) {
    return scrapeOfficialPages(TARGETS, now);
  }
};

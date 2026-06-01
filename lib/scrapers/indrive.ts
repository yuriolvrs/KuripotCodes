import type { Scraper } from "./types";
import { scrapeOfficialPages } from "./official-pages";

const TARGETS = [{ platform: "inDrive" as const, url: "https://indrive.com/en-ph" }];

export const inDriveScraper: Scraper = {
  name: "indrive",
  async run({ now }) {
    return scrapeOfficialPages(TARGETS, now);
  }
};

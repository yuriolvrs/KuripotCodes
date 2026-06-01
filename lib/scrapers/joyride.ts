import type { Scraper } from "./types";
import { scrapeOfficialPages } from "./official-pages";

const TARGETS = [{ platform: "JoyRide" as const, url: "https://joyride.com.ph/" }];

export const joyRideScraper: Scraper = {
  name: "joyride",
  async run({ now }) {
    return scrapeOfficialPages(TARGETS, now);
  }
};

import type { Scraper } from "./types";
import { scrapeOfficialPages } from "./official-pages";

const TARGETS = [{ platform: "Angkas" as const, url: "https://www.angkas.com/" }];

export const angkasScraper: Scraper = {
  name: "angkas",
  async run({ now }) {
    return scrapeOfficialPages(TARGETS, now);
  }
};

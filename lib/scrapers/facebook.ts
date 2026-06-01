import type { Scraper } from "./types";

export const facebookScraper: Scraper = {
  name: "facebook",
  async run() {
    throw new Error("Facebook scraping is not configured; public pages require API access or a logged-in browser session");
  }
};

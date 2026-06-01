import type { Platform, Promo } from "../types";

export interface DiscoveryItem {
  platform: Platform;
  query: string;
  urls: string[];
}

export interface ScraperContext {
  now: Date;
  discoveries: DiscoveryItem[];
}

export interface Scraper {
  name: string;
  run(context: ScraperContext): Promise<Promo[]>;
}

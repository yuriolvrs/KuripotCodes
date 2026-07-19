import type { Promo } from "../types";

export interface ScraperContext {
  now: Date;
}

export interface Scraper {
  name: string;
  run(context: ScraperContext): Promise<Promo[]>;
}

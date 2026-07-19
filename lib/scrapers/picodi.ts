import { parseLooseDate } from "../date";
import type { RawPromo } from "../types";
import { decodeEntities, extractCodes, fetchText, rawToPromos, stripHtml, uniqueBy } from "./shared";
import type { Scraper } from "./types";

const PICODI_TARGETS = [{ platform: "Grab" as const, url: "https://www.picodi.com/ph/grab" }];

function parsePicodiExpiry(block: string) {
  const dataDate = block.match(/\sdata-c=(?:"([^"]+)"|([^\s>]+))/i)?.[1] ?? block.match(/\sdata-c=(?:"([^"]+)"|([^\s>]+))/i)?.[2];
  if (dataDate?.startsWith("2099/12/31")) return undefined;
  if (dataDate) return parseLooseDate(dataDate.replace(/\//g, "-"));

  const visibleExpiry = stripHtml(block).match(/\bExpires:\s*([^|]+?)(?:\s{2,}|$)/i)?.[1]?.trim();
  if (!visibleExpiry || /ongoing/i.test(visibleExpiry)) return undefined;
  return parseLooseDate(visibleExpiry);
}

function clean(value?: string) {
  return decodeEntities(stripHtml(value ?? "")).trim();
}

export function parsePicodiPage(platform: RawPromo["platform"], sourceUrl: string, html: string): RawPromo[] {
  const blocks = Array.from(html.matchAll(/<li class="of[\s\S]*?<\/li>/gi)).map((match) => match[0]);
  const rawPromos: RawPromo[] = [];

  for (const block of blocks) {
    const title = clean(block.match(/<h3 class="of__title">([\s\S]*?)<\/h3>/i)?.[1]);
    if (!title) continue;

    const description = clean(block.match(/<p class="of__description">([\s\S]*?)<\/p>/i)?.[1]);
    const rawCode = decodeEntities(block.match(/\sdata-sc="([^"]*)"/i)?.[1] ?? "");
    const code = extractCodes(rawCode)[0] ?? "";
    const endDate = parsePicodiExpiry(block);
    const combinedText = `${title} ${description}`;

    rawPromos.push({
      platform,
      title,
      code,
      description,
      sourceUrl,
      endDate,
      status: endDate ? undefined : "active",
      discountType: /free/i.test(combinedText) ? "free_ride" : undefined
    });
  }

  return uniqueBy(rawPromos, (promo) => `${promo.platform}:${promo.code || promo.title}`);
}

export const picodiScraper: Scraper = {
  name: "picodi",
  async run({ now }) {
    const settled = await Promise.allSettled(
      PICODI_TARGETS.map(async (target) => {
        const html = await fetchText(target.url);
        return parsePicodiPage(target.platform, target.url, html);
      })
    );

    const rawPromos = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
    const failures = settled.filter((result) => result.status === "rejected");

    if (rawPromos.length === 0 && failures.length === PICODI_TARGETS.length) {
      throw new Error("All Picodi requests failed");
    }

    return rawToPromos(rawPromos, now);
  }
};

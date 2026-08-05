import type { RawPromo } from "../types";
import { extractCodes, extractExpiry, fetchText, rawToPromos, stripHtml, titleFromText, uniqueBy } from "./shared";
import type { Scraper } from "./types";

const WETHRIFT_TARGETS = [
  { platform: "Grab" as const, url: "https://www.wethrift.com/grab" },
  { platform: "Angkas" as const, url: "https://www.wethrift.com/angkas" },
  { platform: "Move It" as const, url: "https://www.wethrift.com/move-it" },
  { platform: "inDrive" as const, url: "https://www.wethrift.com/indrive" },
  { platform: "JoyRide" as const, url: "https://www.wethrift.com/joyride" },
  { platform: "Foodpanda" as const, url: "https://www.wethrift.com/foodpanda" }
];

function getRelevantSnippets(html: string) {
  const snippets = html.match(/.{0,220}(?:code|coupon|voucher|promo|discount).{0,260}/gis) ?? [];
  return snippets.map(stripHtml).filter(Boolean);
}

export function parseWethriftPage(platform: RawPromo["platform"], sourceUrl: string, html: string): RawPromo[] {
  const pageText = stripHtml(html);
  const snippets = getRelevantSnippets(html);
  const codes = extractCodes(pageText);
  const rawPromos: RawPromo[] = [];

  for (const code of codes) {
    const context =
      snippets.find((snippet) => snippet.toUpperCase().includes(code)) ??
      pageText.slice(Math.max(0, pageText.toUpperCase().indexOf(code) - 160), pageText.toUpperCase().indexOf(code) + 240);

    rawPromos.push({
      platform,
      title: titleFromText(platform ?? "Other", code, context),
      code,
      description: context.slice(0, 260),
      sourceUrl,
      endDate: extractExpiry(context),
      status: /expired/i.test(context) ? "expired" : undefined
    });
  }

  return uniqueBy(rawPromos, (promo) => `${promo.platform}:${promo.code}`);
}

export const wethriftScraper: Scraper = {
  name: "wethrift",
  async run({ now }) {
    const settled = await Promise.allSettled(
      WETHRIFT_TARGETS.map(async (target) => {
        const html = await fetchText(target.url);
        return parseWethriftPage(target.platform, target.url, html);
      })
    );

    const rawPromos = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
    const failedCount = settled.filter((result) => result.status === "rejected").length;

    if (failedCount === WETHRIFT_TARGETS.length) {
      throw new Error(`All ${WETHRIFT_TARGETS.length} wethrift pages failed (likely blocked)`);
    }
    if (failedCount > 0) {
      console.warn(`[wethrift] ${failedCount}/${WETHRIFT_TARGETS.length} pages failed`);
    }

    return rawToPromos(uniqueBy(rawPromos, (promo) => `${promo.platform}:${promo.code || promo.title}`), now);
  }
};

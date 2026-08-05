import { isPlausibleCode, normalizeCode } from "../normalize";
import type { Platform, RawPromo } from "../types";
import { decodeEntities, extractExpiry, fetchText, mapWithConcurrency, rawToPromos, stripHtml, uniqueBy } from "./shared";
import type { Scraper } from "./types";

const REQUEST_CONCURRENCY = 2;

// ivouchercodes.ph tags every voucher block with the store it actually
// belongs to (class="... stores-<slug> ..."), even though a store's page
// also lists cross-promoted vouchers for unrelated brands. This is the
// reliable signal for which entries are genuinely for our target platform.
const TARGETS: Array<{ platform: Platform; slug: string; url: string }> = [
  { platform: "Grab", slug: "grab", url: "https://ivouchercodes.ph/store/grab" },
  { platform: "Angkas", slug: "angkas", url: "https://ivouchercodes.ph/store/angkas" },
  { platform: "JoyRide", slug: "joyride", url: "https://ivouchercodes.ph/store/joyride" },
  { platform: "Shopee", slug: "shopee", url: "https://ivouchercodes.ph/store/shopee" },
  { platform: "Lazada", slug: "lazada", url: "https://ivouchercodes.ph/store/lazada" },
  { platform: "Foodpanda", slug: "foodpanda", url: "https://ivouchercodes.ph/store/foodpanda" }
];

export function parseIVoucherCodesPage(platform: Platform, slug: string, sourceUrl: string, html: string): RawPromo[] {
  const blocks = html.split(/<div class="item item-top\b/gi).slice(1);
  const rawPromos: RawPromo[] = [];

  for (const block of blocks) {
    const tagEnd = block.indexOf(">");
    const openingTag = tagEnd >= 0 ? block.slice(0, tagEnd) : block;
    const storeSlug = openingTag.match(/\bstores-([a-z0-9-]+)/i)?.[1]?.toLowerCase();
    if (storeSlug !== slug) continue;

    const rawAttr = decodeEntities(block.match(/data-clipboard-text="([^"]*)"/i)?.[1] ?? "").trim();
    // Reject multi-word placeholder text like "Get This Offer" or "CLICK
    // LINK TO GET CODE" before collapsing whitespace would otherwise turn
    // it into something that looks like a plausible code.
    if (!rawAttr || /\s/.test(rawAttr)) continue;

    const code = normalizeCode(rawAttr);
    if (!code || !isPlausibleCode(code)) continue;

    const titleMatch = block.match(/class="my_anchor_link"[^>]*>([\s\S]*?)<\/a>/i);
    const title = titleMatch ? stripHtml(decodeEntities(titleMatch[1])) : `${platform} promo code`;

    const descriptionMatch = block.match(/<p class="desc">([\s\S]*?)<\/p>/i);
    const description = descriptionMatch ? stripHtml(decodeEntities(descriptionMatch[1])) : undefined;

    const combinedText = `${title} ${description ?? ""}`;

    rawPromos.push({
      platform,
      title,
      code,
      description,
      sourceUrl,
      endDate: extractExpiry(combinedText),
      status: /\bexpired\b/i.test(combinedText) ? "expired" : "active"
    });
  }

  return uniqueBy(rawPromos, (promo) => `${promo.platform}:${promo.code}`);
}

export const ivoucherCodesScraper: Scraper = {
  name: "ivouchercodes",
  async run({ now }) {
    const settled = await mapWithConcurrency(TARGETS, REQUEST_CONCURRENCY, async (target) => {
      const html = await fetchText(target.url);
      const promos = parseIVoucherCodesPage(target.platform, target.slug, target.url, html);
      console.log(`[ivouchercodes] ${target.platform}: ${promos.length} codes`);
      return promos;
    });

    const rawPromos = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
    const failures = settled.filter((result) => result.status === "rejected");

    if (rawPromos.length === 0 && failures.length === TARGETS.length) {
      throw new Error("All ivouchercodes requests failed");
    }

    return rawToPromos(rawPromos, now);
  }
};

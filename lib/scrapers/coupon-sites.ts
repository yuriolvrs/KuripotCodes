import { parseLooseDate, toIsoDate } from "../date";
import type { Platform, RawPromo } from "../types";
import { decodeEntities, fetchText, rawToPromos, stripHtml, uniqueBy } from "./shared";
import type { Scraper } from "./types";

type CouponTarget = {
  source: "iprice" | "rappler" | "everysaving";
  platform: Platform;
  url: string;
};

const COUPON_TARGETS: CouponTarget[] = [
  { source: "iprice", platform: "Grab", url: "https://iprice.ph/coupons/grab/" },
  { source: "iprice", platform: "Grab", url: "https://iprice.ph/coupons/grabfood/" },
  { source: "rappler", platform: "Grab", url: "https://coupons.rappler.com/coupons-food-e-hailing/" },
  { source: "rappler", platform: "Grab", url: "https://coupons.rappler.com/grab-coupons/" },
  { source: "rappler", platform: "Grab", url: "https://coupons.rappler.com/grabfood-coupons/" },
  { source: "everysaving", platform: "Grab", url: "https://www.everysaving.ph/shop/grab.com" },
  { source: "everysaving", platform: "Angkas", url: "https://www.everysaving.ph/shop/angkas.com" },
  { source: "everysaving", platform: "JoyRide", url: "https://www.everysaving.ph/shop/joyride.com.ph" }
];

function clean(value?: string) {
  return decodeEntities(stripHtml(value ?? "")).trim();
}

function decodeAttribute(value?: string) {
  return decodeEntities(value ?? "").trim();
}

function visibleCode(value?: string) {
  const cleaned = decodeAttribute(value).replace(/\s+/g, "").toUpperCase();
  if (!cleaned || cleaned.includes("*")) return "";

  const ignored = new Set(["CODE", "COUPON", "DISCOUNT", "PROMO", "VOUCHER"]);
  if (ignored.has(cleaned) || !/^[A-Z0-9][A-Z0-9_-]{3,63}$/.test(cleaned) || !/[A-Z]/.test(cleaned)) {
    return "";
  }

  return cleaned;
}

function endDateFromDaysLeft(block: string, now: Date) {
  const daysLeft = Number.parseInt(block.match(/\b(\d+)\s+days?\s+left\b/i)?.[1] ?? "", 10);
  if (Number.isNaN(daysLeft)) return undefined;

  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + daysLeft);
  return toIsoDate(expiry);
}

function parseStatus(block: string) {
  return /\bexpired\b/i.test(stripHtml(block)) ? ("expired" as const) : undefined;
}

function parseIpricePage(platform: Platform, sourceUrl: string, html: string, now: Date): RawPromo[] {
  const blocks = html
    .split(/<div class="rh_offer_list\b/gi)
    .slice(1)
    .map((block) => `<div class="rh_offer_list${block}`);

  const rawPromos = blocks.flatMap((block): RawPromo[] => {
    const title = clean(block.match(/<h2\b[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>\s*<\/h2>/i)?.[1]);
    if (!title || !/\b(grab|angkas|joy\s*ride|ride|voucher|promo|coupon|discount)\b/i.test(title)) {
      return [];
    }

    const description = clean(block.match(/<div class="rh_gr_middle_desc[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]);
    const code = visibleCode(block.match(/\bdata-clipboard-text="([^"]+)"/i)?.[1]);
    const dealUrl = decodeAttribute(block.match(/<h2\b[\s\S]*?<a\b[^>]*href="([^"]+)"/i)?.[1]);
    const status = parseStatus(block);

    return [
      {
        platform,
        title,
        code,
        description: description || undefined,
        sourceUrl: dealUrl || sourceUrl,
        endDate: endDateFromDaysLeft(block, now),
        status
      }
    ];
  });

  return uniqueBy(rawPromos, (promo) => `${promo.platform}:${promo.code || promo.title}`);
}

function parseRapplerPage(platform: Platform, sourceUrl: string, html: string): RawPromo[] {
  const rows = Array.from(
    html.matchAll(/<tr>\s*<td>[\s\S]*?<a\b([^>]*)>([\s\S]*?)<\/a>[\s\S]*?<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi)
  );

  const tablePromos = rows.flatMap((match): RawPromo[] => {
    const attrs = decodeAttribute(match[1]);
    const title = clean(match[2]);
    if (!title || !isPlatformMention(title, platform)) return [];

    const code = visibleCode(match[3]);
    const expiry = clean(match[4]);
    const offerId = attrs.match(/"_id":"([^"]+)"/)?.[1];
    const position = attrs.match(/"position":(\d+)/)?.[1];
    const subProduct = attrs.match(/"sub_product":"([^"]+)"/)?.[1];
    const offerUrl = new URL(sourceUrl);

    if (offerId) {
      offerUrl.searchParams.set("_id", offerId);
      offerUrl.searchParams.set("position", position ?? "0");
      if (subProduct) offerUrl.searchParams.set("sub_product", subProduct);
      offerUrl.searchParams.set("_exit", sourceUrl);
    }

    return [
      {
        platform,
        title,
        code,
        description: title,
        sourceUrl: offerId ? offerUrl.toString() : sourceUrl,
        endDate: parseLooseDate(expiry),
        status: "active"
      }
    ];
  });

  const cardPromos = parseRapplerCards(platform, sourceUrl, html);

  return uniqueBy([...tablePromos, ...cardPromos], (promo) => `${promo.platform}:${promo.code || promo.title}`);
}

function isPlatformMention(text: string, platform: Platform) {
  if (platform === "Move It") return /\bmove\s*it\b/i.test(text);
  if (platform === "JoyRide") return /\bjoy\s*ride\b/i.test(text);
  return new RegExp(`\\b${platform}\\b`, "i").test(text);
}

function buildRapplerOfferUrl(sourceUrl: string, attrs: string) {
  const offerId = attrs.match(/"_id":"([^"]+)"/)?.[1];
  const position = attrs.match(/"position":(\d+)/)?.[1];
  const subProduct = attrs.match(/"sub_product":"([^"]+)"/)?.[1];
  const offerUrl = new URL(sourceUrl);

  if (offerId) {
    offerUrl.searchParams.set("_id", offerId);
    offerUrl.searchParams.set("position", position ?? "0");
    if (subProduct) offerUrl.searchParams.set("sub_product", subProduct);
    offerUrl.searchParams.set("_exit", sourceUrl);
  }

  return offerId ? offerUrl.toString() : sourceUrl;
}

function parseRapplerCards(platform: Platform, sourceUrl: string, html: string): RawPromo[] {
  const items = Array.from(html.matchAll(/<li class="(?:code|deal)">([\s\S]*?)<\/li>/gi));

  return items.flatMap((match): RawPromo[] => {
    const block = match[1];
    const attrs = decodeAttribute(block.match(/onclick='(coupons\.util\.r[\s\S]*?)'/i)?.[1]);
    const title = clean(block.match(/<h3>([\s\S]*?)<\/h3>/i)?.[1]);
    if (!title || !isPlatformMention(title, platform)) return [];

    const offerText = clean(block.match(/<div class="offer-text[^"]*">([\s\S]*?)<\/div>/i)?.[1]);
    const detail = clean(block.match(/<div class="dn coupon-detail-text[^"]*">([\s\S]*?)<\/div>/i)?.[1]);
    const combinedDescription = [offerText, detail].filter(Boolean).join(" - ");
    const code = visibleCode(block.match(/<p id="code">([\s\S]*?)<\/p>/i)?.[1]);

    return [
      {
        platform,
        title,
        code,
        description: combinedDescription || title,
        sourceUrl: buildRapplerOfferUrl(sourceUrl, attrs),
        status: /\bexpired\b/i.test(block) ? "expired" : "active"
      }
    ];
  });
}

function extractRapplerRevealCode(html: string) {
  return visibleCode(html.match(/<p id="code">([\s\S]*?)<\/p>/i)?.[1]);
}

function isRapplerRevealUrl(url: string) {
  try {
    return new URL(url).searchParams.has("_id");
  } catch {
    return false;
  }
}

async function addRapplerRevealCodes(rawPromos: RawPromo[], referer: string) {
  const settled = await Promise.allSettled(
    rawPromos.map(async (promo): Promise<RawPromo> => {
      if (promo.code || !isRapplerRevealUrl(promo.sourceUrl)) return promo;

      const revealHtml = await fetchText(promo.sourceUrl, 15000, { referer });
      const code = extractRapplerRevealCode(revealHtml);
      return code ? { ...promo, code } : promo;
    })
  );

  return settled.map((result, index) => (result.status === "fulfilled" ? result.value : rawPromos[index]));
}

function linesFromHtml(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/(?:h\d|p|li|div|article|section|td|tr|a|button)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function parseEverySavingPage(platform: Platform, sourceUrl: string, html: string): RawPromo[] {
  const lines = linesFromHtml(html);
  const rawPromos: RawPromo[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const title = lines[index];
    if (!/\b(promo code|voucher|coupon|discount|off)\b/i.test(title) || !new RegExp(`\\b${platform.replace(" ", "\\s*")}\\b`, "i").test(title)) {
      continue;
    }

    const context = lines.slice(Math.max(0, index - 6), index + 8).join(" ");
    const nearbyCodeLine = lines.slice(index, index + 6).find((line) => /\b[A-Z0-9*]{4,24}\b/.test(line));
    const code = visibleCode(nearbyCodeLine);

    rawPromos.push({
      platform,
      title,
      code,
      description: context,
      sourceUrl,
      endDate: parseLooseDate(context.match(/\bValid till\s+([A-Za-z]{3,9}\s+\d{1,2},?\s+20\d{2})/i)?.[1]),
      status: /\bexpired\b/i.test(context) ? "expired" : "active"
    });
  }

  return uniqueBy(rawPromos, (promo) => `${promo.platform}:${promo.code || promo.title}`);
}

async function parseCouponPage(target: CouponTarget, html: string, now: Date) {
  switch (target.source) {
    case "iprice":
      return parseIpricePage(target.platform, target.url, html, now);
    case "rappler":
      return addRapplerRevealCodes(parseRapplerPage(target.platform, target.url, html), target.url);
    case "everysaving":
      return parseEverySavingPage(target.platform, target.url, html);
  }
}

export const couponSitesScraper: Scraper = {
  name: "coupon-sites",
  async run({ now }) {
    const settled = await Promise.allSettled(
      COUPON_TARGETS.map(async (target) => {
        const html = await fetchText(target.url);
        return parseCouponPage(target, html, now);
      })
    );

    const rawPromos = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
    const failures = settled.filter((result) => result.status === "rejected");

    if (rawPromos.length === 0 && failures.length === COUPON_TARGETS.length) {
      throw new Error("All coupon-site requests failed");
    }

    return rawToPromos(rawPromos, now);
  }
};

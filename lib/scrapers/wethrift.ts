import type { RawPromo } from "../types";
import { extractCodes, extractExpiry, fetchText, rawToPromos, stripHtml, titleFromText, uniqueBy } from "./shared";
import type { Scraper } from "./types";

const WETHRIFT_TARGETS = [
  { platform: "Grab" as const, url: "https://www.wethrift.com/grab" },
  { platform: "Angkas" as const, url: "https://www.wethrift.com/angkas" },
  { platform: "Move It" as const, url: "https://www.wethrift.com/move-it" },
  { platform: "inDrive" as const, url: "https://www.wethrift.com/indrive" },
  { platform: "JoyRide" as const, url: "https://www.wethrift.com/joyride" }
];

const WETHRIFT_FALLBACKS: RawPromo[] = [
  { platform: "Angkas", title: "Angkas 10% off your first ride", code: "TAKAYUKI", sourceUrl: "https://www.wethrift.com/angkas", status: "active" },
  { platform: "Angkas", title: "Angkas 50% off first ride for new users", code: "CUBBGBF", sourceUrl: "https://www.wethrift.com/angkas", status: "active" },
  { platform: "Angkas", title: "Angkas 10% off your first ride", code: "ANGKASWSANDY", sourceUrl: "https://www.wethrift.com/angkas", status: "active" },
  { platform: "Angkas", title: "Angkas 10% off first trip", code: "SULITCAVITE", sourceUrl: "https://www.wethrift.com/angkas", status: "active" },
  { platform: "Angkas", title: "Angkas 50% off your first ride", code: "ANGKASSHO", sourceUrl: "https://www.wethrift.com/angkas", status: "active" },
  { platform: "Angkas", title: "Angkas PHP 10 off", code: "AKSRIDESURE", sourceUrl: "https://www.wethrift.com/angkas", status: "active" },
  { platform: "Angkas", title: "Angkas P15 off to/from Ubiquity", code: "WORKJUD", sourceUrl: "https://www.wethrift.com/angkas", status: "active" },
  { platform: "Angkas", title: "Angkas 20% off 1 ride", code: "YOUTELLME", sourceUrl: "https://www.wethrift.com/angkas", status: "active" },
  { platform: "Angkas", title: "Angkas 50% off capped at P50", code: "HELLOBAI", sourceUrl: "https://www.wethrift.com/angkas", status: "active" },
  { platform: "Angkas", title: "Angkas PHP 50 off first booking", code: "JADEANGKASNA", sourceUrl: "https://www.wethrift.com/angkas", status: "active" },

  { platform: "Move It", title: "Move It 70% off travel to and from Cavite and Rizal", code: "FLATFARE70", sourceUrl: "https://www.wethrift.com/move-it", status: "active" },
  { platform: "Move It", title: "Move It 25% off in select areas", code: "MOVEITNORTH", sourceUrl: "https://www.wethrift.com/move-it", status: "active" },
  { platform: "Move It", title: "Move It 30% off your ride", code: "SMCALOOCAN", sourceUrl: "https://www.wethrift.com/move-it", status: "active" },
  { platform: "Move It", title: "Move It 10% off any service", code: "LUCKY10", sourceUrl: "https://www.wethrift.com/move-it", status: "active" },
  { platform: "Move It", title: "Move It 25% off in select areas", code: "MOVEITSOUTH", sourceUrl: "https://www.wethrift.com/move-it", status: "active" },
  { platform: "Move It", title: "Move It 100% off first ride", code: "CAMPUSCREWVYNHART", sourceUrl: "https://www.wethrift.com/move-it", status: "active" },
  { platform: "Move It", title: "Move It 20% off", code: "LETSGOMI", sourceUrl: "https://www.wethrift.com/move-it", status: "active" },
  { platform: "Move It", title: "Move It 20% off all rides", code: "USJRMI", sourceUrl: "https://www.wethrift.com/move-it", status: "active" },
  { platform: "Move It", title: "Move It PHP 40 off at all EDSA Busway Stations", code: "DOTRMI", sourceUrl: "https://www.wethrift.com/move-it", status: "active" },
  { platform: "Move It", title: "Move It 30% off your next trip", code: "ONTIMEMI", sourceUrl: "https://www.wethrift.com/move-it", status: "active" },

  { platform: "JoyRide", title: "JoyRide 50% off for 5 uses", code: "BARATOKAAYO", sourceUrl: "https://www.wethrift.com/joyride", status: "active" },
  { platform: "JoyRide", title: "JoyRide promo code", code: "BUHOKGAMING", sourceUrl: "https://www.wethrift.com/joyride", status: "active" },
  { platform: "JoyRide", title: "JoyRide 10% off", code: "SAVE20", sourceUrl: "https://www.wethrift.com/joyride", status: "active" },
  { platform: "JoyRide", title: "JoyRide 50% off your first month of membership", code: "JOY2025", sourceUrl: "https://www.wethrift.com/joyride", status: "active" },
  { platform: "JoyRide", title: "JoyRide 50% off car rides, 5x use", code: "MURANGJRCAR", sourceUrl: "https://www.wethrift.com/joyride", status: "active" },
  { platform: "JoyRide", title: "JoyRide no booking fee, 10% off first taxi ride", code: "JRTAXICAB", sourceUrl: "https://www.wethrift.com/joyride", status: "active" },
  { platform: "JoyRide", title: "JoyRide 50% off your first car ride", code: "JRCARBICOL", sourceUrl: "https://www.wethrift.com/joyride", status: "active" },
  { platform: "JoyRide", title: "JoyRide 20% off up to PHP 50", code: "JRCDOHIGALAAYCAR", sourceUrl: "https://www.wethrift.com/joyride", status: "active" },
  { platform: "JoyRide", title: "JoyRide 20% off max PHP 20", code: "JRCDOHIGALAAYMC", sourceUrl: "https://www.wethrift.com/joyride", status: "active" },

  { platform: "inDrive", title: "inDrive 15% off first ride", code: "INDRIVE15", sourceUrl: "https://www.wethrift.com/indrive", status: "active" },
  { platform: "inDrive", title: "inDrive 50% off", code: "FATIMA500", sourceUrl: "https://www.wethrift.com/indrive", status: "active" },
  { platform: "inDrive", title: "inDrive promo code", code: "ZARNAB500", sourceUrl: "https://www.wethrift.com/indrive", status: "active" },
  { platform: "inDrive", title: "inDrive promo code", code: "AHSAAN500", sourceUrl: "https://www.wethrift.com/indrive", status: "active" },
  { platform: "inDrive", title: "inDrive 30% off select items", code: "FLASH", sourceUrl: "https://www.wethrift.com/indrive", status: "active" },
  { platform: "inDrive", title: "inDrive 15% off your first trip", code: "OLADOC15", sourceUrl: "https://www.wethrift.com/indrive", status: "active" }
];

function getRelevantSnippets(html: string) {
  const snippets = html.match(/.{0,220}(?:code|coupon|voucher|promo|discount).{0,260}/gis) ?? [];
  return snippets.map(stripHtml).filter(Boolean);
}

function parseWethriftPage(platform: RawPromo["platform"], sourceUrl: string, html: string): RawPromo[] {
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
    const failures = settled.filter((result) => result.status === "rejected");

    if (rawPromos.length === 0 && failures.length === WETHRIFT_TARGETS.length) {
      return rawToPromos(WETHRIFT_FALLBACKS, now);
    }

    return rawToPromos(uniqueBy([...rawPromos, ...WETHRIFT_FALLBACKS], (promo) => `${promo.platform}:${promo.code || promo.title}`), now);
  }
};

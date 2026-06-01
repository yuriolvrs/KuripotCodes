import type { Platform, RawPromo } from "../types";
import { extractCodes, extractExpiry, fetchText, rawToPromos, stripHtml, titleFromText, uniqueBy } from "./shared";

export interface OfficialPageTarget {
  platform: Platform;
  url: string;
}

export async function scrapeOfficialPages(targets: OfficialPageTarget[], now: Date) {
  const settled = await Promise.allSettled(targets.map((target) => fetchText(target.url)));
  const rawPromos: RawPromo[] = [];

  for (let index = 0; index < settled.length; index += 1) {
    const result = settled[index];
    const target = targets[index];
    if (result.status !== "fulfilled") continue;

    const text = stripHtml(result.value);
    for (const code of extractCodes(text)) {
      rawPromos.push({
        platform: target.platform,
        title: titleFromText(target.platform, code, text),
        code,
        sourceUrl: target.url,
        description: text.slice(0, 260),
        endDate: extractExpiry(text)
      });
    }
  }

  return rawToPromos(uniqueBy(rawPromos, (promo) => `${promo.platform}:${promo.code}:${promo.sourceUrl}`), now);
}

import { loadPromos, savePromos } from "../lib/storage";
import { mergePromos, isPlausibleCode } from "../lib/normalize";
import type { Promo } from "../lib/types";

// Same blocklist used by the EverySaving scraper (lib/scrapers/everysaving.ts)
// to catch cross-promoted unrelated brands that were previously mistagged
// with the wrong platform.
const FOREIGN_BRAND_BLOCKLIST =
  /\b(traveloka|airpaz|emirates|klook|agoda|expedia|booking\.com|cebu\s*pacific|philippine\s*airlines|airasia|scoot|qatar\s*airways|singapore\s*airlines|cathay\s*pacific|zalora|lazada|shopee|foodpanda|grubhub)\b/i;

function isJunk(promo: Promo) {
  const text = `${promo.title} ${promo.description ?? ""}`;
  return FOREIGN_BRAND_BLOCKLIST.test(text);
}

async function main() {
  const before = await loadPromos();

  const withoutJunkBrands = before.filter((promo) => !isJunk(promo));
  const droppedJunkBrands = before.length - withoutJunkBrands.length;

  let droppedGarbageCodes = 0;
  const withValidCodes = withoutJunkBrands.map((promo) => {
    if (promo.code && !isPlausibleCode(promo.code)) {
      droppedGarbageCodes += 1;
      return { ...promo, code: "" };
    }
    return promo;
  });

  // Re-run through mergePromos to dedupe re-keyed (now codeless) entries and
  // apply the standard expired/stale pruning rule.
  const cleaned = mergePromos([], withValidCodes, new Date());

  await savePromos(cleaned);

  console.log(`Before: ${before.length}`);
  console.log(`Dropped (wrong-platform junk): ${droppedJunkBrands}`);
  console.log(`Codes blanked (garbage/undecoded): ${droppedGarbageCodes}`);
  console.log(`After: ${cleaned.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

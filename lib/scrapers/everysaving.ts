import { parseLooseDate } from "../date";
import { isPlausibleCode } from "../normalize";
import type { Platform, RawPromo } from "../types";
import { fetchText, stripHtml, uniqueBy } from "./shared";

// EverySaving shop pages cross-promote unrelated brands alongside the target
// platform's deals; these entries would otherwise get mistagged with the
// wrong platform. Skip anything that clearly belongs to a different brand.
const FOREIGN_BRAND_BLOCKLIST =
  /\b(traveloka|airpaz|emirates|klook|agoda|expedia|booking\.com|cebu\s*pacific|philippine\s*airlines|airasia|scoot|qatar\s*airways|singapore\s*airlines|cathay\s*pacific|zalora|lazada|shopee|foodpanda|grubhub)\b/i;

export function isRelevantEntry(title: string, description: string): boolean {
  return !FOREIGN_BRAND_BLOCKLIST.test(`${title} ${description}`);
}

interface EverySavingEntry {
  title: string;
  code: string;
  description: string;
  endDate: string | undefined;
  status: "active" | "expired" | undefined;
  totalCodes: number;
}

export function decodeEntryCodes(encoded: string): string {
  if (!encoded) return "";

  encoded = encoded.slice(0, -3);

  const parsed: number[] = [];
  const n = encoded.length;

  for (let i = 0; i < n; i += 6) {
    const getPair = (offset: number) => encoded.slice(i + offset, i + offset + 2);
    const rearranged = getPair(0) + getPair(4) + getPair(2);
    parsed.push(parseInt(rearranged, 16));
  }

  const charCount = n / 6;
  const MAGIC = "7f8d73c2ff87ebab9055a3deb1a74efc70adf32e";

  let result = "";
  for (let i = 0; i < charCount; ++i) {
    const regex = new RegExp(`.{${i}}(.).{0,${charCount - 1 - i}}`, "g");
    const matches: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(MAGIC)) !== null) {
      matches.push(match[1].charCodeAt(0));
    }
    const checksum = matches.reduce((a, b) => a + b, 0);
    const codePoint = parsed[i] - checksum;
    result = String.fromCharCode(codePoint) + result;
  }

  return result;
}

async function scrapeEverySavingWithPuppeteer(url: string, platform: Platform): Promise<EverySavingEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let puppeteerModule: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let StealthPlugin: any;

  try {
    puppeteerModule = await import("puppeteer-extra");
    StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default;
  } catch {
    console.log(`[${platform.toLowerCase()}] Puppeteer not available, skipping everysaving.ph`);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const puppeteer: any = puppeteerModule.default ?? puppeteerModule;
  puppeteer.use(StealthPlugin());

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const entries = await page.evaluate((): EverySavingEntry[] => {
      const articles = document.querySelectorAll("article.js-ed");
      const results: EverySavingEntry[] = [];

      for (const article of articles) {
        const title = article.querySelector("h4")?.textContent?.trim() ?? "";
        const modal = article.getAttribute("data-modal");
        if (!modal) continue;

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(modal);
        } catch {
          continue;
        }

        const ic = (parsed["entry.ic"] as number) ?? 0;
        if (ic !== 1) continue;

        const encoded = (parsed["entry.code"] as string) ?? "";
        if (!encoded) continue;

        results.push({
          title: (parsed["entry.title"] as string) ?? title,
          code: encoded,
          description: (parsed["entry.description"] as string) ?? "",
          endDate: (parsed["entry.exd"] as string) || undefined,
          status: (parsed["entry.crossed"] as number) === 1 ? "expired" : "active",
          totalCodes: (parsed["entry.total_codes"] as number) ?? 0
        });
      }

      return results;
    });

    return entries
      .filter((entry: EverySavingEntry) => isRelevantEntry(entry.title, entry.description))
      .map((entry: EverySavingEntry) => ({
        ...entry,
        code: decodeEntryCodes(entry.code)
      }))
      .filter((entry: EverySavingEntry) => isPlausibleCode(entry.code));
  } finally {
    await browser.close();
  }
}

export function parseEverySavingFromHtml(html: string, url: string, platform: Platform): RawPromo[] {
  const rawPromos: RawPromo[] = [];

  const entryBlocks = html.match(/<article[^>]*class="[^"]*js-ed[^"]*"[^>]*>[\s\S]*?<\/article>/gi) ?? [];

  for (const block of entryBlocks) {
    const modalMatch = block.match(/data-modal="([^"]*)"/);
    if (!modalMatch) continue;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(modalMatch[1].replace(/&quot;/g, '"'));
    } catch {
      continue;
    }

    const ic = (parsed["entry.ic"] as number) ?? 0;
    if (ic !== 1) continue;

    const encoded = (parsed["entry.code"] as string) ?? "";
    if (!encoded) continue;

    const title = (parsed["entry.title"] as string) ?? "";
    const description = (parsed["entry.description"] as string) ?? "";
    const expiryStr = (parsed["entry.exd"] as string) || undefined;
    const isExpired = (parsed["entry.crossed"] as number) === 1;

    if (!isRelevantEntry(stripHtml(title), stripHtml(description))) continue;

    const code = decodeEntryCodes(encoded);
    if (!isPlausibleCode(code)) continue;

    rawPromos.push({
      platform,
      title: stripHtml(title) || `${platform} promo code`,
      code,
      description: stripHtml(description),
      sourceUrl: url,
      endDate: parseLooseDate(expiryStr),
      status: isExpired ? "expired" : "active"
    });
  }

  return uniqueBy(rawPromos, (promo) => `${promo.platform}:${promo.code || promo.title}`);
}

export async function scrapeEverySaving(url: string, platform: Platform): Promise<RawPromo[]> {
  try {
    const entries = await scrapeEverySavingWithPuppeteer(url, platform);
    if (entries.length > 0) {
      console.log(`[${platform.toLowerCase()}] EverySaving: ${entries.length} codes via Puppeteer`);
      return entries.map((entry) => ({
        platform,
        title: stripHtml(entry.title),
        code: entry.code,
        description: stripHtml(entry.description),
        sourceUrl: url,
        endDate: parseLooseDate(entry.endDate),
        status: entry.status
      }));
    }
  } catch (err) {
    console.log(`[${platform.toLowerCase()}] EverySaving Puppeteer failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`[${platform.toLowerCase()}] EverySaving: falling back to HTTP`);
  try {
    const html = await fetchText(url);
    return parseEverySavingFromHtml(html, url, platform);
  } catch {
    console.log(`[${platform.toLowerCase()}] EverySaving HTTP also failed`);
    return [];
  }
}

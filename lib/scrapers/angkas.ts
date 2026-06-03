import { parseLooseDate } from "../date";
import { detectPlatform } from "../normalize";
import type { RawPromo } from "../types";
import { extractCodes, extractExpiry, fetchText, rawToPromos, stripHtml, titleFromText, uniqueBy } from "./shared";
import type { Scraper } from "./types";

const EVERYSAVING_URL = "https://www.everysaving.ph/shop/angkas.com";
const OFFICIAL_URL = "https://www.angkas.com/";

const REDDIT_SEARCH_URLS = [
  `https://www.reddit.com/r/Philippines/search.json?q=${encodeURIComponent("Angkas promo code voucher")}&restrict_sr=1&sort=new&t=month&limit=25`,
  `https://www.reddit.com/r/PHMotorcycles/search.json?q=${encodeURIComponent("Angkas promo code voucher")}&restrict_sr=1&sort=new&t=month&limit=25`
];

interface EverySavingEntry {
  title: string;
  code: string;
  description: string;
  endDate: string | undefined;
  status: "active" | "expired" | undefined;
  totalCodes: number;
}

function decodeEntryCodes(encoded: string): string {
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

async function scrapeEverySavingWithPuppeteer(): Promise<EverySavingEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let puppeteerModule: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let StealthPlugin: any;

  try {
    puppeteerModule = await import("puppeteer-extra");
    StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default;
  } catch {
    console.log("[angkas] Puppeteer not available, skipping everysaving.ph");
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
    await page.goto(EVERYSAVING_URL, { waitUntil: "networkidle2", timeout: 30000 });

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

    return entries.map((entry: EverySavingEntry) => ({
      ...entry,
      code: decodeEntryCodes(entry.code)
    }));
  } finally {
    await browser.close();
  }
}

function parseEverySavingFromHtml(html: string): RawPromo[] {
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

    const code = decodeEntryCodes(encoded);

    rawPromos.push({
      platform: "Angkas",
      title: stripHtml(title) || "Angkas promo code",
      code,
      description: stripHtml(description),
      sourceUrl: EVERYSAVING_URL,
      endDate: parseLooseDate(expiryStr),
      status: isExpired ? "expired" : "active"
    });
  }

  return uniqueBy(rawPromos, (promo) => `${promo.platform}:${promo.code || promo.title}`);
}

async function scrapeEverySaving(): Promise<RawPromo[]> {
  try {
    const entries = await scrapeEverySavingWithPuppeteer();
    if (entries.length > 0) {
      console.log(`[angkas] EverySaving: ${entries.length} codes via Puppeteer`);
      return entries.map((entry) => ({
        platform: "Angkas" as const,
        title: stripHtml(entry.title),
        code: entry.code,
        description: stripHtml(entry.description),
        sourceUrl: EVERYSAVING_URL,
        endDate: parseLooseDate(entry.endDate),
        status: entry.status
      }));
    }
  } catch (err) {
    console.log(`[angkas] EverySaving Puppeteer failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log("[angkas] EverySaving: falling back to HTTP");
  try {
    const html = await fetchText(EVERYSAVING_URL);
    return parseEverySavingFromHtml(html);
  } catch {
    console.log("[angkas] EverySaving HTTP also failed");
    return [];
  }
}

function parseOfficialPage(html: string): RawPromo[] {
  const text = stripHtml(html);
  const codes = extractCodes(text);

  return uniqueBy(
    codes.map((code) => ({
      platform: "Angkas" as const,
      title: titleFromText("Angkas", code, text),
      code,
      description: text.slice(0, 260),
      sourceUrl: OFFICIAL_URL,
      endDate: extractExpiry(text)
    })),
    (promo) => `${promo.platform}:${promo.code}`
  );
}

interface RedditListing {
  data?: {
    children?: Array<{
      data?: {
        title?: string;
        selftext?: string;
        url?: string;
        permalink?: string;
        created_utc?: number;
      };
    }>;
  };
}

async function scrapeReddit(): Promise<RawPromo[]> {
  const settled = await Promise.allSettled(REDDIT_SEARCH_URLS.map((url) => fetchText(url)));
  const rawPromos: RawPromo[] = [];
  let successfulRequests = 0;

  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    successfulRequests += 1;

    let listing: RedditListing;
    try {
      listing = JSON.parse(result.value) as RedditListing;
    } catch {
      continue;
    }

    for (const child of listing.data?.children ?? []) {
      const post = child.data;
      if (!post) continue;

      const text = [post.title, post.selftext].filter(Boolean).join(" ");
      const platform = detectPlatform(text);
      if (platform !== "Angkas") continue;

      for (const code of extractCodes(text)) {
        rawPromos.push({
          platform: "Angkas",
          title: titleFromText("Angkas", code, text),
          code,
          description: text.slice(0, 260),
          sourceUrl: post.permalink ? `https://www.reddit.com${post.permalink}` : post.url ?? "https://www.reddit.com",
          endDate: extractExpiry(text)
        });
      }
    }
  }

  if (successfulRequests === 0) return [];
  return rawPromos;
}

export const angkasScraper: Scraper = {
  name: "angkas",
  async run({ now }) {
    const [officialResult, everysavingResult] = await Promise.allSettled([
      fetchText(OFFICIAL_URL).then((html) => parseOfficialPage(html)),
      scrapeEverySaving()
    ]);

    const pagePromos = [
      ...(officialResult.status === "fulfilled" ? officialResult.value : []),
      ...(everysavingResult.status === "fulfilled" ? everysavingResult.value : [])
    ];

    let redditPromos: RawPromo[] = [];
    try {
      redditPromos = await scrapeReddit();
      if (redditPromos.length > 0) {
        console.log(`[angkas] Reddit: ${redditPromos.length} results`);
      }
    } catch {
      console.log("[angkas] Reddit search failed");
    }

    const allRawPromos = [...pagePromos, ...redditPromos];

    if (allRawPromos.length === 0) {
      throw new Error("All Angkas requests failed");
    }

    return rawToPromos(uniqueBy(allRawPromos, (promo) => `${promo.platform}:${promo.code || promo.title}:${promo.sourceUrl}`), now);
  }
};

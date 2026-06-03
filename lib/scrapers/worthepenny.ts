import { parseLooseDate } from "../date";
import fs from "node:fs";
import type { Platform, RawPromo } from "../types";

interface WorthPennyOffer {
  title: string;
  description: string;
  code: string;
  discount: string;
  endDate: string | undefined;
  sourceUrl: string;
  couponId: string;
}

async function findChrome(): Promise<string | undefined> {
  if (process.platform === "win32") {
    const candidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)"}\\Google\\Chrome\\Application\\chrome.exe`
    ];
    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) return candidate;
    }
  }
  if (process.platform === "darwin") {
    const candidate = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    if (fs.existsSync(candidate)) return candidate;
  }
  if (process.platform === "linux") {
    const candidates = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/snap/bin/chromium"
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

async function extractOffers(page: any, url: string): Promise<WorthPennyOffer[]> {
  return (await page.evaluate((pageUrl: string) => {
    const seen = new Set<string>();
    const results: Array<{
      title: string; description: string; code: string; discount: string;
      endDate: undefined; sourceUrl: string; couponId: string;
    }> = [];

    for (const el of document.querySelectorAll("._coupon_item[data-coupon_id]")) {
      const couponId = el.getAttribute("data-coupon_id") ?? "";
      if (!couponId || seen.has(couponId)) continue;
      seen.add(couponId);

      const code = el.getAttribute("data-code") ?? "";
      const name = el.getAttribute("data-name") ?? "";
      const ot = el.getAttribute("data-ot") ?? "";

      const titleEl = el.querySelector(".title");
      const title = (titleEl?.textContent ?? el.textContent ?? "").trim();
      const descEl = el.querySelector("[class*='desc'], [class*='summary'], [class*='details']");
      const description = descEl?.textContent?.trim() ?? "";

      let discount = "";
      const styleEls = el.querySelectorAll("style");
      for (const style of styleEls) {
        const text = style.textContent ?? "";
        const matches = text.matchAll(/content\s*:\s*"([^"]+)"/g);
        const parts: string[] = [];
        for (const m of matches) {
          const val = m[1].trim();
          if (val && !/^(OFF|ONLY|FOR|CODE|FREE)$/i.test(val)) parts.push(val);
        }
        if (parts.length > 0) {
          const joined = parts.join("");
          const hasPercent = joined.includes("%");
          if (ot === "pct" && !hasPercent) discount = `${joined}% Off`;
          else if (ot === "frp" || ot === "pfp" || !ot) discount = joined;
          else discount = `${joined} Off`;
          break;
        }
      }

      const link = el.tagName === "A"
        ? (el as HTMLAnchorElement).href
        : (el.querySelector("a[href*='OfferId']") as HTMLAnchorElement | null)?.href ?? pageUrl;

      results.push({ title: title || `${name} promo code`, description, code, discount, endDate: undefined, sourceUrl: link, couponId });
    }
    return results;
  }, url)) as WorthPennyOffer[];
}

async function setupPage(page: any, url: string, platform: string): Promise<boolean> {
  await page.setViewport({ width: 1920, height: 1080 });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    const orig = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (this: WebGLRenderingContext, p: number) {
      if (p === 37445) return "Intel Inc.";
      if (p === 37446) return "Intel Iris OpenGL Engine";
      return orig.call(this, p);
    };
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  try {
    await page.waitForFunction(() => !document.title?.includes("Just a moment"), { timeout: 30000 });
  } catch {
    console.log(`[${platform}] Cloudflare challenge blocked worthepenny.com`);
    return false;
  }

  try {
    await page.waitForFunction(
      () => document.querySelectorAll("._coupon_item[data-coupon_id]").length > 0,
      { timeout: 15000 }
    );
  } catch {
    console.log(`[${platform}] No coupon items found on worthepenny.com`);
    return false;
  }

  await new Promise((r) => setTimeout(r, 2000));
  return true;
}

export async function scrapeWorthPenny(url: string, platform: Platform): Promise<RawPromo[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let puppeteerModule: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let StealthPlugin: any;

  try {
    puppeteerModule = await import("puppeteer-extra");
    StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default;
  } catch {
    console.log(`[${platform.toLowerCase()}] Puppeteer not available, skipping worthepenny.com`);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const puppeteer: any = puppeteerModule.default ?? puppeteerModule;
  puppeteer.use(StealthPlugin());

  const platformLower = platform.toLowerCase();

  // Try with real Chrome first (needed for Cloudflare managed challenge)
  const chromePath = await findChrome();
  if (chromePath) {
    try {
      const browser = await puppeteer.launch({
        headless: false,
        executablePath: chromePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
          "--disable-features=IsolateOrigins,site-per-process",
          "--window-size=1920,1080"
        ]
      });

      try {
        const page = await browser.newPage();
        if (await setupPage(page, url, platformLower)) {
          const offers = await extractOffers(page, url);
          const filtered = offers.filter((o: WorthPennyOffer) => o.code || o.title);
          if (filtered.length > 0) {
            console.log(`[${platformLower}] WorthPenny: ${filtered.length} codes via Chrome`);
            return filtered.map((offer) => ({
              platform,
              title: offer.discount ? `${offer.discount} - ${offer.title}` : offer.title,
              code: offer.code,
              description: offer.description || undefined,
              sourceUrl: offer.sourceUrl,
              endDate: parseLooseDate(offer.endDate),
              status: "active" as const
            }));
          }
        }
      } finally {
        await browser.close();
      }
    } catch (err) {
      console.log(`[${platformLower}] WorthPenny Chrome failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Fallback: try headless Chromium (unlikely to pass Cloudflare but try anyway)
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"]
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");

      if (await setupPage(page, url, platformLower)) {
        const offers = await extractOffers(page, url);
        const filtered = offers.filter((o: WorthPennyOffer) => o.code || o.title);
        if (filtered.length > 0) {
          console.log(`[${platformLower}] WorthPenny: ${filtered.length} codes via headless`);
          return filtered.map((offer) => ({
            platform,
            title: offer.discount ? `${offer.discount} - ${offer.title}` : offer.title,
            code: offer.code,
            description: offer.description || undefined,
            sourceUrl: offer.sourceUrl,
            endDate: parseLooseDate(offer.endDate),
            status: "active" as const
          }));
        }
      }
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.log(`[${platformLower}] WorthPenny headless failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`[${platformLower}] WorthPenny: no codes found`);
  return [];
}

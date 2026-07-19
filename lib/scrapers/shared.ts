import { parseLooseDate } from "../date";
import { normalizePromo } from "../normalize";
import type { Platform, Promo, RawPromo } from "../types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36 PHRidePromoAggregator/0.1";

async function fetchTextOnce(url: string, timeoutMs: number, headers: HeadersInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/json",
        ...headers
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchText(
  url: string,
  timeoutMs = 15000,
  headers: HeadersInit = {},
  retries = 2
) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetchTextOnce(url, timeoutMs, headers);
    } catch (error) {
      lastError = error;
      if (attempt < retries) await delay(500 * 2 ** attempt);
    }
  }

  throw lastError;
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = { status: "fulfilled", value: await fn(items[index], index) };
      } catch (error) {
        results[index] = { status: "rejected", reason: error };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export function stripHtml(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

export function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractCodes(text: string) {
  const explicit = Array.from(
    text.matchAll(/\b(?:code|voucher|coupon|promo code)\s*(?:is|:|-)?\s*["']?([A-Z0-9][A-Z0-9_-]{3,24})\b/gi)
  ).map((match) => match[1]);
  const generic = text.match(/\b[A-Z0-9][A-Z0-9_-]{4,24}\b/g) ?? [];
  const ignored = new Set([
    "HTTP",
    "HTTPS",
    "WWW",
    "PHP",
    "HTML",
    "JSON",
    "BLOCKS",
    "PROMO",
    "VOUCHER",
    "COUPON",
    "DISCOUNT",
    "ACTIVE",
    "EXPIRED",
    "TODAY",
    "PHILIPPINES",
    "GRAB",
    "ANGKAS",
    "INDRIVE",
    "JOYRID",
    "MOVE"
  ]);

  return uniqueBy(
    [...explicit, ...generic.filter((code) => /\d/.test(code))]
      .map((code) => code.toUpperCase())
      .filter((code) => !ignored.has(code))
      .filter((code) => /[A-Z]/.test(code) && /\d|[A-Z]{4,}/.test(code)),
    (code) => code
  );
}

export function extractExpiry(text: string) {
  const expiry = text.match(
    /\b(?:expires|expiry|valid until|valid through|until|ends)\s+([A-Za-z]{3,9}\s+\d{1,2}(?:,\s*20\d{2})?|\d{1,2}\/\d{1,2}\/20\d{2}|20\d{2}-\d{2}-\d{2})/i
  );
  return parseLooseDate(expiry?.[1]);
}

export function rawToPromos(rawPromos: RawPromo[], now: Date): Promo[] {
  return rawPromos.map((raw) => normalizePromo(raw, now));
}

export function titleFromText(platform: Platform, code: string, text: string) {
  const percent = text.match(/\b\d{1,2}\s?%\s*(?:off|discount)?\b/i)?.[0];
  const fixed = text.match(/\b(?:PHP|P|₱)\s?\d{2,4}\b/i)?.[0];
  const discount = percent ?? fixed;

  if (discount) return `${platform} ${discount} promo`;
  if (code) return `${platform} promo code ${code}`;
  return `${platform} ride promo`;
}

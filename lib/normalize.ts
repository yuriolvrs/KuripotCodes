import crypto from "node:crypto";
import { getPromoStatus } from "./date";
import { PLATFORMS, type Platform, type Promo, type RawPromo } from "./types";

const PLATFORM_ALIASES: Array<[Platform, RegExp]> = [
  ["Grab", /\bgrab\b/i],
  ["Angkas", /\bangkas\b/i],
  ["Move It", /\bmove\s*it\b/i],
  ["inDrive", /\bindrive\b/i],
  ["JoyRide", /\bjoy\s*ride\b/i],
  ["Shopee", /\bshopee\b/i],
  ["Lazada", /\blazada\b/i],
  ["Foodpanda", /\bfoodpanda\b/i]
];

export function detectPlatform(value: string): Platform {
  const match = PLATFORM_ALIASES.find(([, pattern]) => pattern.test(value));
  return match?.[0] ?? "Other";
}

export function normalizeCode(code?: string) {
  return (code ?? "")
    .replace(/[^a-z0-9_-]/gi, "")
    .toUpperCase()
    .slice(0, 64);
}

export function isPlausibleCode(code?: string) {
  if (!code) return true;
  return /^[A-Z0-9][A-Z0-9_-]{3,}$/.test(code);
}

function normalizeTitleForId(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function createPromoId(promo: Pick<Promo, "platform" | "code" | "title" | "sourceUrl">) {
  // Codeless promos key off platform+title only (not sourceUrl) so the same
  // deal re-found on a different page, or a page whose URL shifts, keeps its
  // id and doesn't lose its bookmarked/working/used flags.
  const stableKey = promo.code
    ? `${promo.platform}:${promo.code}`
    : `${promo.platform}:${normalizeTitleForId(promo.title)}`;

  return crypto.createHash("sha1").update(stableKey).digest("hex").slice(0, 16);
}

export function inferDiscount(text: string): Pick<Promo, "discountType" | "discountValue"> {
  const percent = text.match(/\b(\d{1,2})\s?%\s*(off|discount)?\b/i);
  if (percent) {
    return { discountType: "percent", discountValue: `${percent[1]}%` };
  }

  const fixed = text.match(/(?:\b(?:PHP|P)|₱)\s?(\d{2,4})\b/i);
  if (fixed) {
    return { discountType: "fixed", discountValue: `PHP ${fixed[1]}` };
  }

  if (/\bfree\s+(ride|trip|booking)\b/i.test(text)) {
    return { discountType: "free_ride", discountValue: "Free ride" };
  }

  return { discountType: "unknown" };
}

const FIRST_TIME_ONLY_PATTERN =
  /\b(first[\s-]?time|1st[\s-]?time|new)\s+(user|users|customer|customers|rider|riders|driver)s?\b|\b(first|1st)\s+(?:\w+\s+){0,2}(ride|trip|order|booking|bookings|purchase|delivery)\b|\bnew\s+to\s+(grab|angkas|move\s*it|indrive|joyride|shopee|lazada|foodpanda)\b/i;

export function detectFirstTimeOnly(text: string): boolean {
  return FIRST_TIME_ONLY_PATTERN.test(text);
}

export function normalizePromo(raw: RawPromo, now = new Date()): Promo {
  const title = (raw.title || raw.description || "Ride-hailing promo").trim();
  const sourceText = [title, raw.description, raw.sourceUrl].filter(Boolean).join(" ");
  const platform =
    raw.platform && PLATFORMS.includes(raw.platform) ? raw.platform : detectPlatform(sourceText);
  const rawCode = normalizeCode(raw.code);
  const code = isPlausibleCode(rawCode) ? rawCode : "";
  const inferred = inferDiscount(sourceText);
  const status = raw.status ?? getPromoStatus(raw.endDate);
  const seenAt = now.toISOString();

  const promo: Promo = {
    id: "",
    platform,
    title,
    code,
    description: raw.description?.trim() || undefined,
    discountType: raw.discountType ?? inferred.discountType,
    discountValue: raw.discountValue ?? inferred.discountValue,
    region: raw.region?.trim() || "Philippines",
    sourceUrl: raw.sourceUrl,
    startDate: raw.startDate,
    endDate: raw.endDate,
    status,
    firstSeen: seenAt,
    lastSeen: seenAt,
    firstTimeOnly: raw.firstTimeOnly ?? (detectFirstTimeOnly(sourceText) || undefined)
  };

  promo.id = createPromoId(promo);
  return promo;
}

const EXPIRED_RETENTION_DAYS = 14;
const STALE_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(isoDate: string, now: Date) {
  return (now.getTime() - new Date(isoDate).getTime()) / DAY_MS;
}

function shouldPrune(promo: Promo, now: Date) {
  if (promo.bookmarked || promo.working) return false;

  if (promo.status === "expired") {
    return daysSince(promo.lastSeen, now) > EXPIRED_RETENTION_DAYS;
  }

  return daysSince(promo.lastSeen, now) > STALE_RETENTION_DAYS;
}

export function mergePromos(existing: Promo[], incoming: Promo[], now = new Date()) {
  const map = new Map<string, Promo>();
  const nowIso = now.toISOString();

  for (const promo of existing) {
    const id = createPromoId(promo);
    map.set(id, {
      ...promo,
      id,
      status: getPromoStatus(promo.endDate)
    });
  }

  for (const promo of incoming) {
    const id = createPromoId(promo);
    if (promo.code) {
      const previousNoCodeId = createPromoId({ ...promo, code: "" });
      const previousNoCode = map.get(previousNoCodeId);
      if (previousNoCode && !previousNoCode.code) {
        map.delete(previousNoCodeId);
      }

      for (const [existingId, existingPromo] of map.entries()) {
        if (
          !existingPromo.code &&
          existingPromo.platform === promo.platform &&
          existingPromo.title === promo.title
        ) {
          map.delete(existingId);
        }
      }
    } else {
      for (const [existingId, existingPromo] of map.entries()) {
        if (
          existingId !== id &&
          !existingPromo.code &&
          existingPromo.platform === promo.platform &&
          existingPromo.title === promo.title
        ) {
          map.delete(existingId);
        }
      }
    }

    const previous = map.get(id);

    map.set(id, {
      ...previous,
      ...promo,
      id,
      firstSeen: previous?.firstSeen ?? promo.firstSeen ?? nowIso,
      lastSeen: nowIso,
      status: getPromoStatus(promo.endDate) === "expired" ? "expired" : promo.status
    });
  }

  return Array.from(map.values())
    .filter((promo) => !shouldPrune(promo, now))
    .sort((a, b) => {
    const codeSort = Number(Boolean(b.code)) - Number(Boolean(a.code));
    if (codeSort !== 0) return codeSort;
    return b.lastSeen.localeCompare(a.lastSeen);
  });
}

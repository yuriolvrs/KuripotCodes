import crypto from "node:crypto";
import { getPromoStatus } from "./date";
import { PLATFORMS, type Platform, type Promo, type RawPromo } from "./types";

const PLATFORM_ALIASES: Array<[Platform, RegExp]> = [
  ["Grab", /\bgrab\b/i],
  ["Angkas", /\bangkas\b/i],
  ["Move It", /\bmove\s*it\b/i],
  ["inDrive", /\bindrive\b/i],
  ["JoyRide", /\bjoy\s*ride\b/i]
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

export function createPromoId(promo: Pick<Promo, "platform" | "code" | "title" | "sourceUrl">) {
  const stableKey = promo.code
    ? `${promo.platform}:${promo.code}`
    : `${promo.platform}:${promo.title}:${promo.sourceUrl}`;

  return crypto.createHash("sha1").update(stableKey).digest("hex").slice(0, 16);
}

export function inferDiscount(text: string): Pick<Promo, "discountType" | "discountValue"> {
  const percent = text.match(/\b(\d{1,2})\s?%\s*(off|discount)?\b/i);
  if (percent) {
    return { discountType: "percent", discountValue: `${percent[1]}%` };
  }

  const fixed = text.match(/\b(?:PHP|P|₱)\s?(\d{2,4})\b/i);
  if (fixed) {
    return { discountType: "fixed", discountValue: `PHP ${fixed[1]}` };
  }

  if (/\bfree\s+(ride|trip|booking)\b/i.test(text)) {
    return { discountType: "free_ride", discountValue: "Free ride" };
  }

  return { discountType: "unknown" };
}

export function normalizePromo(raw: RawPromo, now = new Date()): Promo {
  const title = (raw.title || raw.description || "Ride-hailing promo").trim();
  const sourceText = [title, raw.description, raw.sourceUrl].filter(Boolean).join(" ");
  const platform =
    raw.platform && PLATFORMS.includes(raw.platform) ? raw.platform : detectPlatform(sourceText);
  const code = normalizeCode(raw.code);
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
    lastSeen: seenAt
  };

  promo.id = createPromoId(promo);
  return promo;
}

export function mergePromos(existing: Promo[], incoming: Promo[], now = new Date()) {
  const map = new Map<string, Promo>();
  const nowIso = now.toISOString();

  for (const promo of existing) {
    map.set(createPromoId(promo), {
      ...promo,
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

  return Array.from(map.values()).sort((a, b) => {
    const codeSort = Number(Boolean(b.code)) - Number(Boolean(a.code));
    if (codeSort !== 0) return codeSort;
    return b.lastSeen.localeCompare(a.lastSeen);
  });
}

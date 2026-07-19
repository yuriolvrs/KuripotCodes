import { describe, expect, it } from "vitest";
import { createPromoId, isPlausibleCode, mergePromos, normalizePromo } from "../normalize";
import type { Promo, RawPromo } from "../types";

describe("isPlausibleCode", () => {
  it("accepts a well-formed code", () => {
    expect(isPlausibleCode("SAVE20")).toBe(true);
  });

  it("accepts an empty/undefined code (title-only promos)", () => {
    expect(isPlausibleCode("")).toBe(true);
    expect(isPlausibleCode(undefined)).toBe(true);
  });

  it("rejects codes shorter than 4 characters", () => {
    expect(isPlausibleCode("C")).toBe(false);
    expect(isPlausibleCode("BX")).toBe(false);
    expect(isPlausibleCode("Y-L")).toBe(false);
  });

  it("rejects non-alphanumeric garbage", () => {
    expect(isPlausibleCode("ꬴ잸")).toBe(false);
  });
});

describe("createPromoId", () => {
  it("is stable for codeless promos regardless of sourceUrl", () => {
    const idA = createPromoId({
      platform: "Grab",
      code: "",
      title: "Grab 10% off first ride",
      sourceUrl: "https://source-a.example/deal",
    });
    const idB = createPromoId({
      platform: "Grab",
      code: "",
      title: "Grab 10% off first ride",
      sourceUrl: "https://source-b.example/other-deal",
    });
    expect(idA).toBe(idB);
  });

  it("is stable across minor title casing/punctuation differences", () => {
    const idA = createPromoId({
      platform: "Grab",
      code: "",
      title: "Grab 10% off first ride!",
      sourceUrl: "https://source-a.example/deal",
    });
    const idB = createPromoId({
      platform: "Grab",
      code: "",
      title: "grab 10% off first ride",
      sourceUrl: "https://source-b.example/other-deal",
    });
    expect(idA).toBe(idB);
  });

  it("differs when the title actually changes", () => {
    const idA = createPromoId({ platform: "Grab", code: "", title: "Grab 10% off", sourceUrl: "https://x" });
    const idB = createPromoId({ platform: "Grab", code: "", title: "Grab 20% off", sourceUrl: "https://x" });
    expect(idA).not.toBe(idB);
  });

  it("keys coded promos off platform+code, ignoring title/sourceUrl", () => {
    const idA = createPromoId({ platform: "Grab", code: "SAVE20", title: "A", sourceUrl: "https://x" });
    const idB = createPromoId({ platform: "Grab", code: "SAVE20", title: "B", sourceUrl: "https://y" });
    expect(idA).toBe(idB);
  });
});

function makePromo(overrides: Partial<Promo>): Promo {
  const raw: RawPromo = {
    platform: "Grab",
    title: "Grab promo",
    code: "SAVE20",
    sourceUrl: "https://example.com",
    ...overrides,
  };
  const promo = normalizePromo(raw, new Date("2026-07-19T00:00:00.000Z"));
  return { ...promo, ...overrides };
}

describe("mergePromos pruning", () => {
  const now = new Date("2026-07-19T00:00:00.000Z");

  it("drops expired promos not seen in over 14 days", () => {
    const stale = makePromo({
      status: "expired",
      lastSeen: "2026-06-01T00:00:00.000Z",
      endDate: "2020-01-01",
    });
    const result = mergePromos([stale], [], now);
    expect(result).toHaveLength(0);
  });

  it("keeps expired promos seen within 14 days", () => {
    const recent = makePromo({
      status: "expired",
      lastSeen: "2026-07-10T00:00:00.000Z",
      endDate: "2020-01-01",
    });
    const result = mergePromos([recent], [], now);
    expect(result).toHaveLength(1);
  });

  it("drops codeless/unknown promos not seen in over 30 days", () => {
    const stale = makePromo({
      code: "",
      status: "unknown",
      lastSeen: "2026-06-01T00:00:00.000Z",
    });
    const result = mergePromos([stale], [], now);
    expect(result).toHaveLength(0);
  });

  it("never prunes bookmarked or working promos regardless of age", () => {
    const bookmarked = makePromo({
      status: "expired",
      lastSeen: "2026-01-01T00:00:00.000Z",
      endDate: "2026-01-01",
      bookmarked: true,
    });
    const working = makePromo({
      code: "",
      status: "unknown",
      lastSeen: "2026-01-01T00:00:00.000Z",
      working: true,
    });
    const result = mergePromos([bookmarked, working], [], now);
    expect(result).toHaveLength(2);
  });

  it("preserves bookmarked/working/used flags across a re-scrape merge", () => {
    const existing = makePromo({ bookmarked: true, used: true });
    const incoming = normalizePromo(
      { platform: "Grab", title: "Grab promo", code: "SAVE20", sourceUrl: "https://example.com" },
      now
    );
    const [result] = mergePromos([existing], [incoming], now);
    expect(result.bookmarked).toBe(true);
    expect(result.used).toBe(true);
    expect(result.lastSeen).toBe(now.toISOString());
  });
});

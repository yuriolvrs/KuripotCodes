import { describe, expect, it } from "vitest";
import { decodeEntryCodes, isRelevantEntry, parseEverySavingFromHtml } from "../everysaving";

describe("isRelevantEntry", () => {
  it("allows entries that don't mention an unrelated brand", () => {
    expect(isRelevantEntry("Angkas 10% off your first ride", "Valid on all trips")).toBe(true);
  });

  it("blocks cross-promoted unrelated brands (the wrong-platform bug)", () => {
    expect(isRelevantEntry("Traveloka App Coupon Code: Enjoy P350 Off First Booking", "")).toBe(false);
    expect(isRelevantEntry("Airpaz Promo Code", "Up to P1,500 off flights")).toBe(false);
    expect(isRelevantEntry("Get 10% off flights", "Emirates exclusive offer")).toBe(false);
  });
});

// Fixture built by inverting the decode arithmetic so it deterministically
// decodes to "SAVE2026" — lets tests exercise the real decode path without
// needing a captured live sample.
const ENCODED_SAVE2026 = "00a501008f01009701009d0100dc0100b601000102001402XXX";

describe("decodeEntryCodes", () => {
  it("decodes a known-good encoded payload to its plaintext code", () => {
    expect(decodeEntryCodes(ENCODED_SAVE2026)).toBe("SAVE2026");
  });

  it("is a deterministic pure function of its input", () => {
    const input = `${"a1".repeat(15)}XXX`;
    const first = decodeEntryCodes(input);
    const second = decodeEntryCodes(input);
    expect(first).toBe(second);
    expect(first).toHaveLength((input.length - 3) / 6);
  });

  it("returns an empty string for empty input", () => {
    expect(decodeEntryCodes("")).toBe("");
  });
});

function buildArticle(modal: Record<string, unknown>, title = "") {
  const json = JSON.stringify(modal).replace(/"/g, "&quot;");
  return `<article class="js-ed" data-modal="${json}"><h4>${title}</h4></article>`;
}

describe("parseEverySavingFromHtml", () => {
  const platform = "Angkas" as const;
  const url = "https://www.everysaving.ph/shop/angkas.com";

  it("skips entries without an active code flag (entry.ic !== 1)", () => {
    const html = buildArticle({ "entry.ic": 0, "entry.code": "deadbeef1234567890abcdef123" });
    expect(parseEverySavingFromHtml(html, url, platform)).toHaveLength(0);
  });

  it("skips entries with no code payload", () => {
    const html = buildArticle({ "entry.ic": 1, "entry.code": "" });
    expect(parseEverySavingFromHtml(html, url, platform)).toHaveLength(0);
  });

  it("filters out cross-promoted foreign-brand entries even when ic=1", () => {
    const html = buildArticle({
      "entry.ic": 1,
      "entry.code": ENCODED_SAVE2026,
      "entry.title": "Traveloka App Coupon Code",
      "entry.description": "Enjoy P350 off first booking",
    });
    expect(parseEverySavingFromHtml(html, url, platform)).toHaveLength(0);
  });

  it("extracts title, description, expiry, and status for a valid entry", () => {
    const html = buildArticle({
      "entry.ic": 1,
      "entry.code": ENCODED_SAVE2026,
      "entry.title": "Angkas 10% off your first ride",
      "entry.description": "Valid for new users only",
      "entry.exd": "December 31, 2026",
      "entry.crossed": 0,
    });
    const [promo] = parseEverySavingFromHtml(html, url, platform);
    expect(promo).toBeDefined();
    expect(promo.platform).toBe(platform);
    expect(promo.title).toBe("Angkas 10% off your first ride");
    expect(promo.description).toBe("Valid for new users only");
    expect(promo.endDate).toBe("2026-12-31");
    expect(promo.status).toBe("active");
    expect(promo.sourceUrl).toBe(url);
  });

  it("drops entries whose decoded code is implausible garbage", () => {
    const html = buildArticle({
      "entry.ic": 1,
      "entry.code": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4XXX",
      "entry.title": "Angkas 30% off",
    });
    expect(parseEverySavingFromHtml(html, url, platform)).toHaveLength(0);
  });

  it("marks crossed-out entries as expired", () => {
    const html = buildArticle({
      "entry.ic": 1,
      "entry.code": ENCODED_SAVE2026,
      "entry.title": "Angkas 20% off",
      "entry.crossed": 1,
    });
    const [promo] = parseEverySavingFromHtml(html, url, platform);
    expect(promo.status).toBe("expired");
  });
});

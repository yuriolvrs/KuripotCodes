import { describe, expect, it } from "vitest";
import { extractCodes, extractExpiry, mapWithConcurrency, stripHtml, uniqueBy } from "../shared";

describe("stripHtml", () => {
  it("removes tags, scripts, and styles, collapsing whitespace", () => {
    const html = `<div>Hello <script>evil()</script><style>.x{}</style> <b>world</b>  !</div>`;
    expect(stripHtml(html)).toBe("Hello world !");
  });
});

describe("uniqueBy", () => {
  it("keeps only the first item per key", () => {
    const items = [{ id: "a", n: 1 }, { id: "a", n: 2 }, { id: "b", n: 3 }];
    expect(uniqueBy(items, (i) => i.id)).toEqual([{ id: "a", n: 1 }, { id: "b", n: 3 }]);
  });
});

describe("extractCodes", () => {
  it("finds an explicit 'code:' mention", () => {
    expect(extractCodes("Use code: SAVE20 at checkout")).toContain("SAVE20");
  });

  it("ignores common noise words", () => {
    const codes = extractCodes("PROMO CODE VOUCHER COUPON DISCOUNT ACTIVE EXPIRED TODAY");
    expect(codes).toHaveLength(0);
  });

  it("does not treat a laughter filler after 'promo code' as an actual code", () => {
    expect(extractCodes("Angkas promo code HAHA")).toHaveLength(0);
  });

  it("ignores reduplicated filler words not on the explicit ignore list", () => {
    expect(extractCodes("Use code HUHU at checkout, sobrang sakit")).toHaveLength(0);
  });
});

describe("extractExpiry", () => {
  it("parses an explicit expiry phrase", () => {
    expect(extractExpiry("This deal expires December 31, 2026")).toBe("2026-12-31");
  });

  it("returns undefined when no expiry is mentioned", () => {
    expect(extractExpiry("Just a regular promo with no dates")).toBeUndefined();
  });
});

describe("mapWithConcurrency", () => {
  it("resolves all items and preserves order", async () => {
    const results = await mapWithConcurrency([3, 1, 2], 2, async (n) => n * 10);
    expect(results).toEqual([
      { status: "fulfilled", value: 30 },
      { status: "fulfilled", value: 10 },
      { status: "fulfilled", value: 20 },
    ]);
  });

  it("reports per-item rejections without failing the batch", async () => {
    const results = await mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("boom");
      return n;
    });
    expect(results[0]).toEqual({ status: "fulfilled", value: 1 });
    expect(results[1].status).toBe("rejected");
    expect(results[2]).toEqual({ status: "fulfilled", value: 3 });
  });

  it("never runs more than `limit` items concurrently", async () => {
    let active = 0;
    let maxActive = 0;
    await mapWithConcurrency([1, 2, 3, 4, 5], 2, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
    });
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});

import { describe, expect, it } from "vitest";
import { parseIVoucherCodesPage } from "../ivouchercodes";

function buildBlock({
  storeSlug,
  code,
  title,
  desc = "Some description text",
  extraClass = ""
}: {
  storeSlug: string;
  code: string;
  title: string;
  desc?: string;
  extraClass?: string;
}) {
  return `<div class="item item-top search-item-holder category-content-box new_voucher_box post-1 coupon type-coupon status-publish hentry coupon_category-all-voucher-codes stores-${storeSlug} coupon_type-coupon-code${extraClass}" id="post-1">
    <div class="item-holder">
      <h3 class="voucher_h3">
        <div class="cv_link">
          <a href="javascript:void(0);" class="my_anchor_link" data-clipboard-text="${code}">${title}</a>
        </div>
      </h3>
      <p class="desc">${desc}</p>
    </div>
  </div>`;
}

describe("parseIVoucherCodesPage", () => {
  const url = "https://ivouchercodes.ph/store/angkas";

  it("extracts a valid inline code and title for the matching store", () => {
    const html = buildBlock({ storeSlug: "angkas", code: "NOLATE", title: "P40 Off Voucher Code" });
    const [promo] = parseIVoucherCodesPage("Angkas", "angkas", url, html);
    expect(promo).toBeDefined();
    expect(promo.platform).toBe("Angkas");
    expect(promo.code).toBe("NOLATE");
    expect(promo.title).toBe("P40 Off Voucher Code");
    expect(promo.sourceUrl).toBe(url);
  });

  it("drops cross-promoted blocks for a different store", () => {
    const html = buildBlock({ storeSlug: "agoda-voucher-codes", code: "TRAVELMORE", title: "Agoda 10% off" });
    expect(parseIVoucherCodesPage("Angkas", "angkas", url, html)).toHaveLength(0);
  });

  it("drops multi-word placeholder text disguised as a code", () => {
    const html = buildBlock({ storeSlug: "angkas", code: "Get This Offer", title: "Some deal" });
    expect(parseIVoucherCodesPage("Angkas", "angkas", url, html)).toHaveLength(0);
  });

  it("drops blocks with no code at all", () => {
    const html = buildBlock({ storeSlug: "angkas", code: "", title: "Download the app" });
    expect(parseIVoucherCodesPage("Angkas", "angkas", url, html)).toHaveLength(0);
  });

  it("marks expired offers via the description text", () => {
    const html = buildBlock({
      storeSlug: "angkas",
      code: "OLDCODE1",
      title: "Old deal",
      desc: "This offer has expired"
    });
    const [promo] = parseIVoucherCodesPage("Angkas", "angkas", url, html);
    expect(promo.status).toBe("expired");
  });

  it("parses an expiry date mentioned in the description", () => {
    const html = buildBlock({
      storeSlug: "angkas",
      code: "VALIDCODE1",
      title: "Fresh deal",
      desc: "Valid until December 31, 2026"
    });
    const [promo] = parseIVoucherCodesPage("Angkas", "angkas", url, html);
    expect(promo.endDate).toBe("2026-12-31");
  });

  it("strips the site's own dead 'more' link and its decorative ellipsis out of the description", () => {
    const html = buildBlock({
      storeSlug: "angkas",
      code: "NOLATE",
      title: "P40 Off Voucher Code",
      desc: 'Enjoy a free gift when you sign up.... <a href="https://ivouchercodes.ph/coupon/foo" class="more" title="View the coupon page">more</a>'
    });
    const [promo] = parseIVoucherCodesPage("Angkas", "angkas", url, html);
    expect(promo.description).toBe("Enjoy a free gift when you sign up");
  });

  it("drops an all-ellipsis description entirely", () => {
    const html = buildBlock({
      storeSlug: "angkas",
      code: "NOLATE",
      title: "P40 Off Voucher Code",
      desc: '... <a href="https://ivouchercodes.ph/coupon/foo" class="more">more</a>'
    });
    const [promo] = parseIVoucherCodesPage("Angkas", "angkas", url, html);
    expect(promo.description).toBeUndefined();
  });

  it("deduplicates repeated platform+code entries", () => {
    const block = buildBlock({ storeSlug: "angkas", code: "NOLATE", title: "P40 Off Voucher Code" });
    const html = block + block;
    expect(parseIVoucherCodesPage("Angkas", "angkas", url, html)).toHaveLength(1);
  });
});

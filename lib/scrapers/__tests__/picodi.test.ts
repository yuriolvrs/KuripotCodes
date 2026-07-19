import { describe, expect, it } from "vitest";
import { parsePicodiPage } from "../picodi";

describe("parsePicodiPage", () => {
  const platform = "Grab" as const;
  const url = "https://www.picodi.com/ph/grab";

  it("extracts title, description, code, and expiry from an offer block", () => {
    const html = `
      <ul>
        <li class="of offer">
          <h3 class="of__title">Grab 15% off GrabFood</h3>
          <p class="of__description">Get 15% off your next GrabFood order</p>
          <span data-sc="SAVE15NOW" data-c="2026/12/31">Expires: Dec 31, 2026</span>
        </li>
      </ul>
    `;

    const [promo] = parsePicodiPage(platform, url, html);
    expect(promo).toBeDefined();
    expect(promo.platform).toBe(platform);
    expect(promo.title).toBe("Grab 15% off GrabFood");
    expect(promo.description).toBe("Get 15% off your next GrabFood order");
    expect(promo.code).toBe("SAVE15NOW");
    expect(promo.endDate).toBe("2026-12-31");
    expect(promo.sourceUrl).toBe(url);
  });

  it("treats a 2099/12/31 sentinel date as no expiry", () => {
    const html = `
      <li class="of offer">
        <h3 class="of__title">Grab Unlimited discount</h3>
        <span data-sc="NOEXPIRY99" data-c="2099/12/31"></span>
      </li>
    `;
    const [promo] = parsePicodiPage(platform, url, html);
    expect(promo.endDate).toBeUndefined();
  });

  it("skips blocks with no title", () => {
    const html = `<li class="of offer"><span data-sc="SOMECODE1"></span></li>`;
    expect(parsePicodiPage(platform, url, html)).toHaveLength(0);
  });

  it("marks free-ride offers via discountType", () => {
    const html = `
      <li class="of offer">
        <h3 class="of__title">Grab free ride voucher</h3>
        <p class="of__description">Enjoy a free ride on us</p>
      </li>
    `;
    const [promo] = parsePicodiPage(platform, url, html);
    expect(promo.discountType).toBe("free_ride");
  });

  it("deduplicates offers with the same platform+code", () => {
    const block = `
      <li class="of offer">
        <h3 class="of__title">Grab 15% off GrabFood</h3>
        <span data-sc="SAVE15NOW"></span>
      </li>
    `;
    const html = block + block;
    expect(parsePicodiPage(platform, url, html)).toHaveLength(1);
  });
});

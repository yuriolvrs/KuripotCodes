import { describe, expect, it } from "vitest";
import { extractRapplerRevealCode, parseIpricePage, parseRapplerPage } from "../coupon-sites";

describe("extractRapplerRevealCode", () => {
  it("extracts a code from a reveal page", () => {
    expect(extractRapplerRevealCode('<html><p id="code">RIDEAGAIN</p></html>')).toBe("RIDEAGAIN");
  });

  it("returns empty string when no code element is present", () => {
    expect(extractRapplerRevealCode("<html><p>no code here</p></html>")).toBe("");
  });
});

describe("parseIpricePage", () => {
  it("extracts a Grab offer block", () => {
    const html = `
      <div class="rh_offer_list">
        <h2><a href="https://iprice.ph/deal/1">Grab 20% off voucher code</a></h2>
        <div class="rh_gr_middle_desc">Valid on all rides</div>
        <span data-clipboard-text="GRAB20OFF"></span>
        <span>3 days left</span>
      </div>
    `;
    const [promo] = parseIpricePage("Grab", "https://iprice.ph/coupons/grab/", html, new Date("2026-07-19"));
    expect(promo).toBeDefined();
    expect(promo.code).toBe("GRAB20OFF");
    expect(promo.title).toContain("Grab");
  });

  it("rejects a Lazada voucher ad even though the title contains 'voucher'", () => {
    const html = `
      <div class="rh_offer_list">
        <h2><a href="https://iprice.ph/deal/2">Enjoy P200 off your Lazada cart. Small voucher, sweet savings!</a></h2>
        <div class="rh_gr_middle_desc">Lazada exclusive</div>
      </div>
    `;
    expect(parseIpricePage("Grab", "https://iprice.ph/coupons/grab/", html, new Date("2026-07-19"))).toHaveLength(0);
  });
});

describe("parseRapplerPage", () => {
  it("skips table rows that don't mention the target platform", () => {
    const html = `
      <table>
        <tr><td><a href="https://x">Klook 10% off</a></td><td>KLOOK10</td><td>Dec 31, 2026</td></tr>
      </table>
    `;
    expect(parseRapplerPage("Grab", "https://coupons.rappler.com/grab-coupons/", html)).toHaveLength(0);
  });

  it("rejects a Lazada/foodpanda ad even when the title uses 'Grab' as a verb", () => {
    const html = `
      <table>
        <tr><td><a href="https://x">Grab up to 40% off foodpanda discount for vegetables</a></td><td></td><td></td></tr>
        <tr><td><a href="https://y">Grab P2,000 off sitewide at Lazada with min spend</a></td><td></td><td></td></tr>
      </table>
    `;
    expect(parseRapplerPage("Grab", "https://coupons.rappler.com/grab-coupons/", html)).toHaveLength(0);
  });
});

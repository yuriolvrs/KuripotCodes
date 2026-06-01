import { PLATFORMS, type Platform } from "../types";
import type { DiscoveryItem } from "./types";

const platformQueries: Record<Platform, string[]> = {
  Grab: [
    "Grab promo code Philippines 2026",
    "Grab PH voucher today",
    "site:facebook.com Grab Philippines promo code",
    "site:reddit.com Grab PH promo"
  ],
  Angkas: [
    "Angkas voucher code today",
    "Angkas promo code Philippines",
    "site:facebook.com Angkas promo code",
    "site:reddit.com Angkas voucher"
  ],
  "Move It": [
    "Move It discount code Philippines",
    "Move It voucher code today",
    "Move It Cavite promo",
    "site:reddit.com Move It voucher"
  ],
  inDrive: [
    "inDrive promo code PH",
    "inDrive Philippines promo",
    "site:facebook.com inDrive Philippines promo",
    "site:reddit.com inDrive promo"
  ],
  JoyRide: [
    "JoyRide promo code Philippines",
    "JoyRide voucher code today",
    "site:facebook.com JoyRide Philippines promo",
    "site:reddit.com JoyRide promo"
  ],
  Other: []
};

const knownUrls: Record<Platform, string[]> = {
  Grab: [
    "https://www.grab.com/ph/blog/",
    "https://www.wethrift.com/grab",
    "https://www.couponfollow.com/site/grab.com"
  ],
  Angkas: [
    "https://angkas.com/",
    "https://www.wethrift.com/angkas"
  ],
  "Move It": [
    "https://moveit.com.ph/",
    "https://www.wethrift.com/move-it"
  ],
  inDrive: [
    "https://indrive.com/en/blog/",
    "https://www.wethrift.com/indrive"
  ],
  JoyRide: [
    "https://joyride.com.ph/",
    "https://www.wethrift.com/joyride"
  ],
  Other: []
};

export function getDiscoveryItems(): DiscoveryItem[] {
  return PLATFORMS.filter((platform) => platform !== "Other").map((platform) => ({
    platform,
    query: platformQueries[platform].join(" | "),
    urls: knownUrls[platform]
  }));
}

export function getSearchQueries() {
  return PLATFORMS.flatMap((platform) => platformQueries[platform]);
}

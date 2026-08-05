export const PLATFORMS = [
  "Grab",
  "Angkas",
  "Move It",
  "inDrive",
  "JoyRide",
  "Shopee",
  "Lazada",
  "Foodpanda",
  "Other"
] as const;

export type Platform = (typeof PLATFORMS)[number];

export type DiscountType = "percent" | "fixed" | "free_ride" | "unknown";

export type PromoStatus = "active" | "expired" | "unknown";

export interface Promo {
  id: string;
  platform: Platform;
  title: string;
  code: string;
  description?: string;
  discountType?: DiscountType;
  discountValue?: string;
  region?: string;
  sourceUrl: string;
  startDate?: string;
  endDate?: string;
  status: PromoStatus;
  firstSeen: string;
  lastSeen: string;
  working?: boolean;
  used?: boolean;
  bookmarked?: boolean;
}

export interface RawPromo {
  platform?: Platform;
  title?: string;
  code?: string;
  description?: string;
  discountType?: DiscountType;
  discountValue?: string;
  region?: string;
  sourceUrl: string;
  startDate?: string;
  endDate?: string;
  status?: PromoStatus;
}

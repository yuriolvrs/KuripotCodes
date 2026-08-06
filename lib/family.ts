import type { Platform, Promo } from "./types";
import { promoServiceName } from "./service";

export type Family = "rides" | "delivery" | "shopping";

export const FAMILIES: Family[] = ["rides", "delivery", "shopping"];

export const FAMILY_LABELS: Record<Family, string> = {
  rides: "Rides",
  delivery: "Delivery",
  shopping: "Shopping"
};

const SERVICE_FAMILY: Record<string, Family> = {
  GrabCar: "rides",
  Motorcycle: "rides",
  AngCars: "rides",
  "City rides": "rides",
  "MC Taxi": "rides",
  Car: "rides",
  "Taxi Cab": "rides",
  Bus: "rides",
  "Airport Transfer": "rides",
  RentaCar: "rides",

  GrabFood: "delivery",
  GrabMart: "delivery",
  GrabExpress: "delivery",
  Padala: "delivery",
  Groceries: "delivery",
  Couriers: "delivery",
  Delivery: "delivery",
  HappyMove: "delivery",
  Pabili: "delivery",
  ShopeeFood: "delivery",
  pandamart: "delivery",
  pandapro: "delivery",
  "Restaurant Delivery": "delivery",
  "Free Delivery": "delivery",

  GrabUnlimited: "shopping",
  GrabGifts: "shopping",
  Load: "shopping",
  ShopeeMall: "shopping",
  ShopeePay: "shopping",
  "Free Shipping": "shopping",
  Cashback: "shopping",
  LazMall: "shopping",
  LazWallet: "shopping"
};

const PLATFORM_DEFAULT_FAMILY: Record<Platform, Family | undefined> = {
  Grab: "rides",
  Angkas: "rides",
  "Move It": "rides",
  inDrive: "rides",
  JoyRide: "rides",
  Shopee: "shopping",
  Lazada: "shopping",
  Foodpanda: "delivery",
  Other: undefined
};

export function platformFamily(promo: Promo): Family | undefined {
  const service = promoServiceName(promo);
  if (service && SERVICE_FAMILY[service]) return SERVICE_FAMILY[service];
  return PLATFORM_DEFAULT_FAMILY[promo.platform];
}

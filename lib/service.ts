import type { Promo } from "./types";

export function promoServiceName(promo: Promo) {
  if (promo.platform !== "Grab") return undefined;

  const text = [promo.title, promo.description, promo.sourceUrl].filter(Boolean).join(" ");

  if (/\bgrab\s*food\b|food delivery|5-star eats|greenwich|red ribbon|cake|meal|eats\b/i.test(text)) {
    return "GrabFood";
  }

  if (/\bgrab\s*mart\b|grocer|grocery|pet supplies|personal care|mart order|mart delivery/i.test(text)) {
    return "GrabMart";
  }

  if (/\bgrab\s*express\b|express order|delivery order/i.test(text)) {
    return "GrabExpress";
  }

  if (/\bgrab\s*unlimited\b|unlimited subscriber/i.test(text)) {
    return "GrabUnlimited";
  }

  if (/\bgift card|gift voucher|egift|send gifts?\b/i.test(text)) {
    return "GrabGifts";
  }

  if (/\bgrab\s*car\b|grabsaver|car ride|car rides|ride fares?|rides?\b|quiet ride|split pay|group ride|airport trip/i.test(text)) {
    return "GrabCar";
  }

  return "Grab";
}

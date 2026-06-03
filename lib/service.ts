import type { Platform, Promo } from "./types";

const SERVICE_RULES: Record<Exclude<Platform, "Other">, Array<{ name: string; pattern: RegExp }>> = {
  Grab: [
    { name: "GrabCar", pattern: /\bgrab\s*car\b|grabsaver|car ride|quiet ride|split pay|group ride|airport trip|\brides?\b|ride fare/i },
    { name: "GrabFood", pattern: /\bgrab\s*food\b|food delivery|5-star eats|greenwich|red ribbon|cake|meal|\beats?\b|restaurant/i },
    { name: "GrabMart", pattern: /\bgrab\s*mart\b|grocer|grocery|pet supplies|personal care|mart/i },
    { name: "GrabExpress", pattern: /\bgrab\s*express\b|express delivery|parcel/i },
    { name: "GrabUnlimited", pattern: /\bgrab\s*unlimited\b|unlimited subscri/i },
    { name: "GrabGifts", pattern: /\bgift card|gift voucher|egift|send gifts?\b/i },
  ],
  Angkas: [
    { name: "Motorcycle", pattern: /motorcycle|angkas ride|bike ride|motor taxi|habal/i },
    { name: "Padala", pattern: /padala|angkas padala|package delivery|parcel/i },
    { name: "AngCars", pattern: /angcars|angkas car|car service|4-wheel/i },
  ],
  "Move It": [
    { name: "Motorcycle", pattern: /motorcycle|move it ride|bike|motor taxi/i },
  ],
  inDrive: [
    { name: "City rides", pattern: /city ride|intercity|ride|city to city|\btrip\b/i },
    { name: "Groceries", pattern: /\bgrocer|grocery|mart|supermarket/i },
    { name: "Couriers", pattern: /courier|delivery|package|parcel|express/i },
  ],
  JoyRide: [
    { name: "MC Taxi", pattern: /mc taxi|motorcycle|bike|motor taxi|angkas|hop/i },
    { name: "Car", pattern: /\bcar\b|joyride car|4-wheel|sedan/i },
    { name: "Taxi Cab", pattern: /taxi|taxi cab|cab ride/i },
    { name: "Bus", pattern: /\bbus\b|shuttle|coach/i },
    { name: "Airport Transfer", pattern: /airport|airport transfer|naia|terminal/i },
    { name: "RentaCar", pattern: /rentacar|rent a car|car rental|self.drive/i },
    { name: "Delivery", pattern: /delivery|package|parcel|express/i },
    { name: "HappyMove", pattern: /happymove|happy move|moving|relocation|lipat/i },
    { name: "Pabili", pattern: /pabili|buy for me|personal shopper|pasabuy/i },
    { name: "Load", pattern: /\bload\b|top.up|prepaid/i },
  ],
};

export function promoServiceName(promo: Promo): string | undefined {
  if (promo.platform === "Other") return undefined;
  const rules = SERVICE_RULES[promo.platform];
  if (!rules) return undefined;

  const text = [promo.title, promo.description, promo.sourceUrl].filter(Boolean).join(" ");

  for (const rule of rules) {
    if (rule.pattern.test(text)) return rule.name;
  }

  return undefined;
}

export function getPlatformServices(platform: Platform): string[] {
  if (platform === "Other") return [];
  return SERVICE_RULES[platform]?.map((r) => r.name) ?? [];
}

export const ALL_SERVICES: Record<Exclude<Platform, "Other">, string[]> = {
  Grab: SERVICE_RULES.Grab.map((r) => r.name),
  Angkas: SERVICE_RULES.Angkas.map((r) => r.name),
  "Move It": SERVICE_RULES["Move It"].map((r) => r.name),
  inDrive: SERVICE_RULES.inDrive.map((r) => r.name),
  JoyRide: SERVICE_RULES.JoyRide.map((r) => r.name),
};

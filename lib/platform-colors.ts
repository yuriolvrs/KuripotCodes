import type { Platform } from "./types";

interface PlatformBrand {
  /** Brand-ish color used for chip borders/fills (can be light, e.g. inDrive's lime). */
  color: string;
  /** Text color to pair with `color` when it's used as a solid fill. */
  text: string;
  /** Darkened variant safe to use as plain text on a light background. */
  textOnLight: string;
}

export const PLATFORM_BRAND: Record<Platform, PlatformBrand> = {
  Grab: { color: "oklch(52% 0.16 145)", text: "white", textOnLight: "oklch(42% 0.15 145)" },
  Angkas: { color: "oklch(48% 0.20 25)", text: "white", textOnLight: "oklch(48% 0.20 25)" },
  "Move It": { color: "oklch(48% 0.11 180)", text: "white", textOnLight: "oklch(42% 0.11 180)" },
  inDrive: { color: "oklch(80% 0.19 125)", text: "oklch(19% 0.025 45)", textOnLight: "oklch(40% 0.15 125)" },
  JoyRide: { color: "oklch(45% 0.16 250)", text: "white", textOnLight: "oklch(45% 0.16 250)" },
  Shopee: { color: "oklch(55% 0.19 45)", text: "white", textOnLight: "oklch(48% 0.19 45)" },
  Lazada: { color: "oklch(32% 0.12 270)", text: "white", textOnLight: "oklch(32% 0.12 270)" },
  Foodpanda: { color: "oklch(45% 0.22 350)", text: "white", textOnLight: "oklch(45% 0.22 350)" },
  Other: { color: "oklch(55% 0.01 60)", text: "white", textOnLight: "oklch(42% 0.02 60)" }
};

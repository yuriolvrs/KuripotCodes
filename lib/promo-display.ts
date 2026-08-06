import type { Promo, PromoStatus } from "./types";
import { isExpiringSoon } from "./date";
import type { Family } from "./family";

export type DisplayStatus = PromoStatus | "expiring";

export function displayStatus(promo: Promo): DisplayStatus {
  if (promo.status === "active" && isExpiringSoon(promo.endDate)) return "expiring";
  return promo.status;
}

export const STATUS_LABELS: Record<DisplayStatus, string> = {
  active: "Active",
  expiring: "Ending soon",
  expired: "Expired",
  unknown: "Unconfirmed"
};

export const STATUS_CLASSNAMES: Record<DisplayStatus, string> = {
  active: "bg-status-active text-white",
  expiring: "bg-status-expiring text-white",
  expired: "bg-status-expired text-white",
  unknown: "bg-status-unknown text-white"
};

export const FAMILY_CLASSNAMES: Record<Family, string> = {
  rides: "bg-family-rides text-white",
  delivery: "bg-family-delivery text-white",
  shopping: "bg-family-shopping text-white"
};

export const FAMILY_BADGE_FALLBACK = "bg-ink-soft text-white";

export const FIRST_TIME_ONLY_LABEL = "First-timers only";

export const FIRST_TIME_ONLY_CLASSNAMES = "border-2 border-ink bg-paper text-ink";

export function serviceLabel(platform: string, service: string | undefined) {
  if (!service || service === platform) return platform.toUpperCase();
  return `${platform.toUpperCase()} · ${service.toUpperCase()}`;
}

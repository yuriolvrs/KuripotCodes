export function toIsoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function parseLooseDate(input?: string) {
  if (!input) return undefined;

  const cleaned = input
    .replace(/\b(until|valid through|valid until|expires|expiry|ends)\b/gi, "")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const currentYear = new Date().getFullYear();
  const withYear = /\b20\d{2}\b/.test(cleaned) ? cleaned : `${cleaned} ${currentYear}`;
  const parsed = Date.parse(withYear);

  if (Number.isNaN(parsed)) return undefined;
  return toIsoDate(new Date(parsed));
}

export function getPromoStatus(endDate?: string) {
  if (!endDate) return "unknown" as const;

  const today = toIsoDate();
  return endDate < today ? ("expired" as const) : ("active" as const);
}

export function formatRelativeTime(iso: string, now = new Date()) {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export function isExpiringSoon(endDate?: string, days = 7) {
  if (!endDate) return false;

  const today = new Date(toIsoDate());
  const expiry = new Date(endDate);
  const diff = expiry.getTime() - today.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

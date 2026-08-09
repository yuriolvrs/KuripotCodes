"use client";

import { ArrowUp, Plus, RefreshCw, TicketPercent } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddPromoModal } from "@/components/AddPromoModal";
import { FilterSheet, type BottomFilterState } from "@/components/filter-sheet";
import { PromoCard } from "@/components/promo-card";
import { PromoDetailModal } from "@/components/promo-detail-modal";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { Promo } from "@/lib/types";
import { formatRelativeTime, isExpiringSoon } from "@/lib/date";
import { sourceSiteName } from "@/lib/source";
import { promoServiceName } from "@/lib/service";
import { FAMILIES, FAMILY_LABELS, platformFamily, type Family } from "@/lib/family";
import { displayStatus, FAMILY_CLASSNAMES, FAMILY_ICONS } from "@/lib/promo-display";

type FamilyTab = "all" | Family;

interface QuickToggles {
  hasCode: boolean;
  expiring: boolean;
  bookmarked: boolean;
  unused: boolean;
}

const DEFAULT_BOTTOM_FILTERS: BottomFilterState = { platforms: [], statuses: [], sources: [], firstTimeOnly: "any" };
const DEFAULT_TOGGLES: QuickToggles = { hasCode: false, expiring: false, bookmarked: false, unused: false };

const FAMILY_TAB_ORDER: FamilyTab[] = ["all", ...FAMILIES];

const SORT_OPTIONS = [
  { label: "Newest codes first", value: "newest" },
  { label: "Recently updated", value: "updated" },
  { label: "Expiring soon", value: "expiring" },
  { label: "A → Z", value: "alpha" }
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];

const NO_END_DATE = Number.POSITIVE_INFINITY;

function sortPromos(list: Promo[], sort: SortKey): Promo[] {
  const sorted = [...list];
  switch (sort) {
    case "updated":
      sorted.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
      break;
    case "expiring":
      sorted.sort((a, b) => {
        const aTime = a.endDate ? new Date(a.endDate).getTime() : NO_END_DATE;
        const bTime = b.endDate ? new Date(b.endDate).getTime() : NO_END_DATE;
        return aTime - bTime;
      });
      break;
    case "alpha":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "newest":
    default:
      sorted.sort((a, b) => b.firstSeen.localeCompare(a.firstSeen));
      break;
  }
  return sorted;
}

interface PromoDashboardProps {
  initialPromos: Promo[];
}

export function PromoDashboard({ initialPromos }: PromoDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [promos, setPromos] = useState(initialPromos);
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [family, setFamily] = useState<FamilyTab>("all");
  const [toggles, setToggles] = useState<QuickToggles>(() => ({
    ...DEFAULT_TOGGLES,
    bookmarked: searchParams.get("bookmarked") === "1"
  }));
  const [bottomFilters, setBottomFilters] = useState<BottomFilterState>(DEFAULT_BOTTOM_FILTERS);
  const [sort, setSort] = useState<SortKey>("newest");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const lastRefreshed = useMemo(
    () => promos.reduce<string | null>((latest, p) => (!latest || p.lastSeen > latest ? p.lastSeen : latest), null),
    [promos]
  );

  useEffect(() => {
    function handleScroll() {
      setShowBackToTop(window.scrollY > 400);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set("q", query);
    else params.delete("q");
    if (toggles.bookmarked) params.set("bookmarked", "1");
    else params.delete("bookmarked");

    const next = params.toString();
    if (next === searchParams.toString()) return;
    const timeout = setTimeout(() => {
      router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, toggles.bookmarked]);

  const sourceOptions = useMemo(
    () => Array.from(new Set(promos.map((p) => sourceSiteName(p.sourceUrl)))).sort(),
    [promos]
  );

  const filteredPromos = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = promos.filter((p) => {
      const service = promoServiceName(p) ?? p.platform;
      const source = sourceSiteName(p.sourceUrl);
      const promoFamily = platformFamily(p);
      const status = displayStatus(p);
      const statusChips = bottomFilters.statuses.filter((s) => s !== "used" && s !== "unused");
      const usedChips = bottomFilters.statuses.filter((s) => s === "used" || s === "unused");

      if (family !== "all" && promoFamily !== family) return false;
      if (bottomFilters.platforms.length && !bottomFilters.platforms.includes(p.platform)) return false;
      if (statusChips.length && !statusChips.includes(status)) return false;
      if (usedChips.length && !usedChips.some((v) => (v === "used" ? p.used : !p.used))) return false;
      if (bottomFilters.sources.length && !bottomFilters.sources.includes(source)) return false;
      if (bottomFilters.firstTimeOnly === "first_only" && !p.firstTimeOnly) return false;
      if (bottomFilters.firstTimeOnly === "not_first_only" && p.firstTimeOnly) return false;
      if (toggles.hasCode && !p.code) return false;
      if (toggles.expiring && !isExpiringSoon(p.endDate)) return false;
      if (toggles.bookmarked && !p.bookmarked) return false;
      if (toggles.unused && p.used) return false;

      if (q) {
        const hay = [p.title, p.code, p.description, p.platform, source, service]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return sortPromos(filtered, sort);
  }, [promos, query, family, bottomFilters, toggles, sort]);

  const activeFilterCount =
    bottomFilters.platforms.length +
    bottomFilters.statuses.length +
    bottomFilters.sources.length +
    (bottomFilters.firstTimeOnly !== "any" ? 1 : 0);

  const selectedPromo = selectedId ? promos.find((p) => p.id === selectedId) ?? null : null;

  function emptyMessage() {
    if (toggles.bookmarked) return { title: "NO BOOKMARKS YET", sub: "Tap the B stamp on any code to save it here." };
    if (toggles.unused) return { title: "NO UNUSED CODES", sub: "Codes you haven't marked as used will show up here." };
    return { title: "NOTHING HERE", sub: "Try a different search or clear your filters." };
  }

  function clearAllFilters() {
    setQuery("");
    setFamily("all");
    setToggles(DEFAULT_TOGGLES);
    setBottomFilters(DEFAULT_BOTTOM_FILTERS);
  }

  async function runScrape() {
    setIsScraping(true);
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const payload = (await res.json()) as {
        ok: boolean;
        foundCount?: number;
        savedCount?: number;
        promos?: Promo[];
        failures?: Array<{ scraper: string; message: string }>;
        message?: string;
      };
      if (!res.ok || !payload.ok) throw new Error(payload.message ?? "Scrape failed");
      setPromos(payload.promos ?? promos);
      const warnings = payload.failures?.length
        ? ` ${payload.failures.length} source${payload.failures.length !== 1 ? "s" : ""} blocked or failed.`
        : "";
      toast({ title: `Found ${payload.foundCount ?? 0}; saved ${payload.savedCount ?? 0}.${warnings}` });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Scrape failed", variant: "error" });
    } finally {
      setIsScraping(false);
    }
  }

  function handlePromoUpdate(updated: Promo) {
    setPromos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  const empty = emptyMessage();

  return (
    <main className="min-h-screen bg-paper pb-16">
      <div className="bg-brand px-5 pb-6 pt-5">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <TicketPercent className="size-[clamp(24px,5vw,36px)] shrink-0 text-white" strokeWidth={2.25} />
              <div className="font-display leading-none text-white" style={{ fontSize: "clamp(28px, 6vw, 42px)", letterSpacing: "0.02em" }}>
                KuripotCodes
              </div>
            </div>
            <div className="mt-1 text-sm text-white/85">Bawas gastos. All the promo codes in one place!</div>
          </div>
          <div className="font-mono text-xs tracking-wide text-white/85">
            {promos.length} CODES TRACKED
            {lastRefreshed ? ` · UPDATED ${formatRelativeTime(lastRefreshed, now).toUpperCase()}` : ""}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b-[3px] border-ink bg-paper px-5 py-3.5">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-4 gap-1.5 sm:gap-2.5">
          {FAMILY_TAB_ORDER.map((tab) => {
            const active = tab === family;
            const color = tab === "all" ? "bg-brand" : FAMILY_CLASSNAMES[tab].split(" ")[0];
            const Icon = tab === "all" ? TicketPercent : FAMILY_ICONS[tab];
            return (
              <div key={tab} className="relative">
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 translate-x-1 translate-y-1 rounded-[6px] bg-[oklch(var(--ink))]"
                />
                <button
                  type="button"
                  onClick={() => setFamily(tab)}
                  className={
                    "relative flex w-full items-center justify-center gap-1 whitespace-nowrap rounded-[6px] border-2 border-ink px-1.5 py-2.5 font-display text-[11px] tracking-normal transition-all duration-150 ease-out sm:gap-2 sm:px-5 sm:py-2.5 sm:text-[15px] sm:tracking-wide " +
                    (active ? "translate-x-1 translate-y-1 " : "translate-x-0 translate-y-0 ") +
                    (active ? `${color} text-white` : "bg-card text-ink")
                  }
                >
                  <Icon className="size-3.5 shrink-0 sm:size-4" strokeWidth={2.25} />
                  {tab === "all" ? "ALL" : FAMILY_LABELS[tab].toUpperCase()}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mx-auto flex w-full max-w-[1200px] items-center gap-2 sm:flex-wrap sm:gap-2.5">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search codes, platforms, stores..."
            className="min-w-0 flex-1 rounded border-2 border-dashed border-ink bg-card px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-solid focus:ring-[3px] focus:ring-brand focus:ring-offset-1 sm:min-w-[200px] sm:px-3.5 sm:py-3"
          />
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            className="shrink-0 whitespace-nowrap rounded border-2 border-ink bg-card px-3 py-2.5 font-display text-xs tracking-wide shadow-[2px_2px_0_oklch(var(--ink))] sm:px-4 sm:py-3 sm:text-sm"
          >
            <span className="sm:hidden">FILTERS{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</span>
            <span className="hidden sm:inline">MORE FILTERS{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</span>
          </button>
        </div>

        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5 sm:flex-nowrap sm:gap-2 sm:overflow-x-auto">
            {(
              [
                { key: "hasCode", label: "HAS CODE" },
                { key: "expiring", label: "EXPIRING SOON" },
                { key: "bookmarked", label: "BOOKMARKED" },
                { key: "unused", label: "UNUSED" }
              ] as const
            ).map((chip) => {
              const active = toggles[chip.key];
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setToggles((prev) => ({ ...prev, [chip.key]: !prev[chip.key] }))}
                  className={
                    "whitespace-nowrap rounded-full border-2 px-3 py-1.5 font-sans text-[13px] font-semibold sm:px-3.5 sm:py-2 sm:text-sm " +
                    (active ? "border-ink bg-ink text-white" : "border-line bg-transparent text-ink")
                  }
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <div className="whitespace-nowrap font-mono text-xs text-ink-soft">
              SHOWING {filteredPromos.length} OF {promos.length}
            </div>
            <Select
              aria-label="Sort by"
              className="h-8 w-auto min-w-0 border-[1.5px] py-0 pl-2.5 pr-7 text-xs font-medium"
              options={SORT_OPTIONS as unknown as { label: string; value: string }[]}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] p-5">
        {filteredPromos.length === 0 ? (
          <div className="flex flex-col items-center gap-3.5 py-16 text-center">
            <div className="-rotate-2 border-[3px] border-ink px-6 py-3.5 font-display text-[30px] tracking-wide">
              {empty.title}
            </div>
            <div className="max-w-[360px] text-ink-soft">{empty.sub}</div>
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-2 rounded border-2 border-brand bg-brand px-5 py-2.5 font-display text-white shadow-[3px_3px_0_oklch(var(--ink))]"
            >
              CLEAR FILTERS
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-[18px]">
            {filteredPromos.map((promo) => (
              <PromoCard
                key={promo.id}
                promo={promo}
                onUpdate={handlePromoUpdate}
                onOpen={() => setSelectedId(promo.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto flex max-w-[1200px] items-center justify-center gap-2 px-5 pb-2 opacity-60">
        <button
          type="button"
          onClick={runScrape}
          disabled={isScraping}
          className="flex items-center gap-1.5 rounded border border-line px-2.5 py-1 font-mono text-[11px] tracking-wide text-ink-soft disabled:opacity-60"
        >
          <RefreshCw className={isScraping ? "size-3 animate-spin" : "size-3"} />
          {isScraping ? "refreshing…" : "refresh"}
        </button>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 rounded border border-line px-2.5 py-1 font-mono text-[11px] tracking-wide text-ink-soft"
        >
          <Plus className="size-3" />
          add promo manually
        </button>
        <span className="font-mono text-[11px] text-ink-soft">
          (local dev only — won&apos;t run on the vercel site)
        </span>
      </div>

      <FilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        state={bottomFilters}
        onChange={(partial) => setBottomFilters((prev) => ({ ...prev, ...partial }))}
        onReset={() => setBottomFilters(DEFAULT_BOTTOM_FILTERS)}
        sourceOptions={sourceOptions}
      />

      <PromoDetailModal
        promo={selectedPromo}
        onClose={() => setSelectedId(null)}
        onUpdate={handlePromoUpdate}
      />

      <AddPromoModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onAdded={(promo) => {
          setPromos((prev) => [promo, ...prev]);
          toast({ title: `Added ${promo.title}` });
        }}
      />

      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-30 flex size-12 items-center justify-center rounded-full border-2 border-ink bg-brand text-white shadow-[3px_3px_0_oklch(var(--ink))]"
        >
          <ArrowUp className="size-5" />
        </button>
      )}
    </main>
  );
}

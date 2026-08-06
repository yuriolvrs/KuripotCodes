"use client";

import { Plus, RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddPromoModal } from "@/components/AddPromoModal";
import { FilterSheet, type BottomFilterState } from "@/components/filter-sheet";
import { PromoCard } from "@/components/promo-card";
import { PromoDetailModal } from "@/components/promo-detail-modal";
import { useToast } from "@/components/ui/toast";
import { PLATFORMS, type Promo } from "@/lib/types";
import { isExpiringSoon } from "@/lib/date";
import { sourceSiteName } from "@/lib/source";
import { promoServiceName } from "@/lib/service";
import { FAMILIES, FAMILY_LABELS, platformFamily, type Family } from "@/lib/family";
import { displayStatus, FAMILY_CLASSNAMES } from "@/lib/promo-display";

type FamilyTab = "all" | Family;

interface QuickToggles {
  hasCode: boolean;
  expiring: boolean;
  bookmarked: boolean;
  used: boolean;
}

const DEFAULT_BOTTOM_FILTERS: BottomFilterState = { platforms: [], statuses: [], sources: [], firstTimeOnly: "any" };
const DEFAULT_TOGGLES: QuickToggles = { hasCode: false, expiring: false, bookmarked: false, used: false };

const FAMILY_TAB_ORDER: FamilyTab[] = ["all", ...FAMILIES];

const NUM_PLATFORMS = PLATFORMS.filter((p) => p !== "Other").length;

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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    return promos.filter((p) => {
      const service = promoServiceName(p) ?? p.platform;
      const source = sourceSiteName(p.sourceUrl);
      const promoFamily = platformFamily(p);
      const status = displayStatus(p);

      if (family !== "all" && promoFamily !== family) return false;
      if (bottomFilters.platforms.length && !bottomFilters.platforms.includes(p.platform)) return false;
      if (bottomFilters.statuses.length && !bottomFilters.statuses.includes(status)) return false;
      if (bottomFilters.sources.length && !bottomFilters.sources.includes(source)) return false;
      if (bottomFilters.firstTimeOnly === "first_only" && !p.firstTimeOnly) return false;
      if (bottomFilters.firstTimeOnly === "not_first_only" && p.firstTimeOnly) return false;
      if (toggles.hasCode && !p.code) return false;
      if (toggles.expiring && !isExpiringSoon(p.endDate)) return false;
      if (toggles.bookmarked && !p.bookmarked) return false;
      if (toggles.used && !p.used) return false;

      if (q) {
        const hay = [p.title, p.code, p.description, p.platform, source, service]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [promos, query, family, bottomFilters, toggles]);

  const activeFilterCount =
    bottomFilters.platforms.length +
    bottomFilters.statuses.length +
    bottomFilters.sources.length +
    (bottomFilters.firstTimeOnly !== "any" ? 1 : 0);

  const selectedPromo = selectedId ? promos.find((p) => p.id === selectedId) ?? null : null;

  function emptyMessage() {
    if (toggles.bookmarked) return { title: "NO BOOKMARKS YET", sub: "Tap the B stamp on any code to save it here." };
    if (toggles.used) return { title: "NOTHING USED YET", sub: "Codes you've marked as used will show up here." };
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
            <div className="font-display leading-none text-white" style={{ fontSize: "clamp(28px, 6vw, 42px)", letterSpacing: "0.02em" }}>
              KURIPOTCODES
            </div>
            <div className="mt-1 text-sm text-white/85">Bawas gastos. All the promo codes in one place!</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runScrape}
              disabled={isScraping}
              className="flex items-center gap-1.5 rounded border-2 border-white/70 px-3 py-1.5 font-display text-xs tracking-wide text-white disabled:opacity-60"
            >
              <RefreshCw className={isScraping ? "size-3.5 animate-spin" : "size-3.5"} />
              {isScraping ? "REFRESHING" : "REFRESH"}
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded border-2 border-white/70 px-3 py-1.5 font-display text-xs tracking-wide text-white"
            >
              <Plus className="size-3.5" />
              ADD
            </button>
          </div>
          <div className="font-mono text-xs tracking-wide text-white/85">
            {promos.length} CODES TRACKED · {NUM_PLATFORMS} PLATFORMS
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-20 flex flex-col gap-3 border-b-[3px] border-ink bg-paper px-5 py-3.5">
        <div className="mx-auto flex w-full max-w-[1200px] gap-2.5 overflow-x-auto pb-0.5">
          {FAMILY_TAB_ORDER.map((tab) => {
            const active = tab === family;
            const color = tab === "all" ? "bg-brand" : FAMILY_CLASSNAMES[tab].split(" ")[0];
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFamily(tab)}
                className={
                  "whitespace-nowrap rounded-[6px] border-2 border-ink px-5 py-2.5 font-display text-[15px] tracking-wide transition-transform " +
                  (active ? `${color} text-white shadow-[4px_4px_0_oklch(var(--ink))] -translate-x-0.5 -translate-y-0.5` : "bg-card text-ink shadow-[2px_2px_0_oklch(var(--ink))]")
                }
              >
                {tab === "all" ? "ALL" : FAMILY_LABELS[tab].toUpperCase()}
              </button>
            );
          })}
        </div>

        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-2.5">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search codes, platforms, stores..."
            className="min-w-[200px] flex-1 rounded border-2 border-dashed border-ink bg-card px-3.5 py-3 font-mono text-sm text-ink outline-none focus:border-solid focus:ring-[3px] focus:ring-brand focus:ring-offset-1"
          />
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            className="whitespace-nowrap rounded border-2 border-ink bg-card px-4 py-3 font-display text-sm tracking-wide shadow-[2px_2px_0_oklch(var(--ink))]"
          >
            MORE FILTERS{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>

        <div className="mx-auto flex w-full max-w-[1200px] gap-2 overflow-x-auto">
          {(
            [
              { key: "hasCode", label: "HAS CODE" },
              { key: "expiring", label: "EXPIRING SOON" },
              { key: "bookmarked", label: "BOOKMARKED" },
              { key: "used", label: "USED" }
            ] as const
          ).map((chip) => {
            const active = toggles[chip.key];
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setToggles((prev) => ({ ...prev, [chip.key]: !prev[chip.key] }))}
                className={
                  "whitespace-nowrap rounded-full border-2 px-3.5 py-2 font-sans text-sm font-semibold " +
                  (active ? "border-ink bg-ink text-white" : "border-line bg-transparent text-ink")
                }
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <div className="mx-auto w-full max-w-[1200px] font-mono text-xs text-ink-soft">
          SHOWING {filteredPromos.length} OF {promos.length}
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

      <FilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        state={bottomFilters}
        onChange={(partial) => setBottomFilters((prev) => ({ ...prev, ...partial }))}
        onReset={() => setBottomFilters(DEFAULT_BOTTOM_FILTERS)}
        sourceOptions={sourceOptions}
      />

      <PromoDetailModal
        key={selectedPromo?.id ?? "none"}
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
    </main>
  );
}

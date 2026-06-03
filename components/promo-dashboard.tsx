"use client";

import { Filter, Plus, RefreshCw, Search } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { AddPromoModal } from "@/components/AddPromoModal";
import { FilterSheet } from "@/components/filter-sheet";
import { PromoCard } from "@/components/promo-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Platform, type Promo, type PromoStatus } from "@/lib/types";
import { isExpiringSoon } from "@/lib/date";
import { sourceSiteName } from "@/lib/source";
import { promoServiceName } from "@/lib/service";

interface FilterState {
  platforms: Platform[];
  services: string[];
  source: string;
  statuses: PromoStatus[];
  usedOnly: boolean;
  bookmarkedOnly: boolean;
  expiringSoon: boolean;
  hasCodeOnly: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  platforms: [],
  services: [],
  source: "All",
  statuses: [],
  usedOnly: false,
  bookmarkedOnly: false,
  expiringSoon: false,
  hasCodeOnly: false,
};

interface PromoDashboardProps {
  initialPromos: Promo[];
  initialPlatform?: Platform | "All";
  initialBookmarked?: boolean;
  initialService?: string;
}

export function PromoDashboard({
  initialPromos,
  initialPlatform = "All",
  initialBookmarked = false,
  initialService = "All",
}: PromoDashboardProps) {
  const [promos, setPromos] = useState(initialPromos);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...DEFAULT_FILTERS,
    platforms: initialPlatform === "All" ? [] : [initialPlatform],
    services: initialService !== "All" ? [initialService] : [],
    bookmarkedOnly: initialBookmarked,
  }));
  const [filterOpen, setFilterOpen] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      services: initialService !== "All" ? [initialService] : [],
      bookmarkedOnly: initialBookmarked,
    }));
  }, [initialService, initialBookmarked]);

  const activeCount = promos.filter((p) => p.status === "active").length;

  const lastUpdated = promos[0]?.lastSeen
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Manila",
      }).format(new Date(promos[0].lastSeen))
    : "Not scraped yet";

  const sourceOptions = useMemo(() => {
    const sources = Array.from(new Set(promos.map((p) => sourceSiteName(p.sourceUrl)))).sort();
    return [
      { label: "All sources", value: "All" },
      ...sources.map((v) => ({ label: v, value: v })),
    ];
  }, [promos]);

  const filteredPromos = useMemo(() => {
    const q = query.trim().toLowerCase();

    return promos.filter((p) => {
      const service = promoServiceName(p) ?? p.platform;
      const source = sourceSiteName(p.sourceUrl);

      const matchesQuery =
        !q ||
        [p.title, p.code, p.description, p.platform, p.region, source, service]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesPlatform = filters.platforms.length === 0 || filters.platforms.includes(p.platform);
      const matchesService =
        filters.services.length === 0 || (service && filters.services.includes(service));
      const matchesSource = filters.source === "All" || source === filters.source;
      const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(p.status);
      const matchesUsed = !filters.usedOnly || p.used === true;
      const matchesExpiry = !filters.expiringSoon || isExpiringSoon(p.endDate);
      const matchesCode = !filters.hasCodeOnly || Boolean(p.code);
      const matchesBookmark = !filters.bookmarkedOnly || p.bookmarked === true;

      return (
        matchesQuery &&
        matchesPlatform &&
        matchesService &&
        matchesSource &&
        matchesStatus &&
        matchesUsed &&
        matchesExpiry &&
        matchesCode &&
        matchesBookmark
      );
    });
  }, [promos, query, filters]);

  const activeFilterCount = (() => {
    let count = 0;
    if (filters.platforms.length > 0) count += filters.platforms.length;
    if (filters.services.length > 0) count += filters.services.length;
    if (filters.source !== "All") count++;
    if (filters.statuses.length > 0) count += filters.statuses.length;
    if (filters.usedOnly) count++;
    if (filters.bookmarkedOnly) count++;
    if (filters.expiringSoon) count++;
    if (filters.hasCodeOnly) count++;
    return count;
  })();

  function updateFilters(partial: Partial<FilterState>) {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  function resetFilters() {
    setFilters({
      ...DEFAULT_FILTERS,
      platforms: initialPlatform === "All" ? [] : [initialPlatform],
    });
  }

  async function runScrape() {
    setIsScraping(true);
    setScrapeMessage(null);
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
      setScrapeMessage(`Found ${payload.foundCount ?? 0}; saved ${payload.savedCount ?? 0}.${warnings}`);
    } catch (err) {
      setScrapeMessage(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      setIsScraping(false);
    }
  }

  function handlePromoUpdate(updated: Promo) {
    setPromos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  return (
    <main className="flex min-h-screen flex-col">
      <div className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
          <label className="relative flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search promos..."
              className="h-9 pl-9"
            />
          </label>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterOpen(true)}
            className="relative shrink-0"
          >
            <Filter className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>

          <Button size="sm" variant="outline" onClick={runScrape} disabled={isScraping}>
            <RefreshCw className={isScraping ? "size-4 animate-spin" : "size-4"} />
            <span className="hidden sm:inline">{isScraping ? "Refreshing..." : "Refresh"}</span>
          </Button>

          <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>

        <div className="flex items-center gap-4 border-t px-4 py-2 text-xs text-muted-foreground lg:px-6">
          <span>
            <strong className="text-foreground">{promos.length}</strong> Total
          </span>
          <span>
            <strong className="text-foreground">{activeCount}</strong> Active
          </span>
          <span>
            <strong className="text-foreground">{filteredPromos.length}</strong> Shown
          </span>
          <span className="ml-auto hidden sm:inline">Updated {lastUpdated}</span>
          {scrapeMessage && (
            <span className="truncate text-[11px]">{scrapeMessage}</span>
          )}
        </div>
      </div>

      <section className="flex-1 px-4 py-5 lg:px-6">
        {filteredPromos.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredPromos.map((promo) => (
              <PromoCard key={promo.id} promo={promo} onUpdate={handlePromoUpdate} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <p className="text-lg font-semibold">No promos match your filters</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search or resetting the filters.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="mt-4"
            >
              Reset filters
            </Button>
          </div>
        )}
      </section>

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        state={filters}
        onChange={updateFilters}
        onReset={resetFilters}
        sourceOptions={sourceOptions}
        promos={promos}
      />

      <AddPromoModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onAdded={(promo) => {
          setPromos((prev) => [promo, ...prev]);
          setScrapeMessage(`Added ${promo.title}.`);
        }}
      />
    </main>
  );
}

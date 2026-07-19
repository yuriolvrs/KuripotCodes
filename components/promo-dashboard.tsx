"use client";

import { ArrowUpDown, Filter, LayoutGrid, Plus, RefreshCw, Search } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { AddPromoModal } from "@/components/AddPromoModal";
import { FilterSheet } from "@/components/filter-sheet";
import { PromoCard } from "@/components/promo-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { type Platform, type Promo, type PromoStatus } from "@/lib/types";
import { isExpiringSoon } from "@/lib/date";
import { sourceSiteName } from "@/lib/source";
import { promoServiceName } from "@/lib/service";

type SortOption = "newest" | "oldest" | "expiring" | "platform";
type GroupOption = "none" | "platform" | "service" | "status";

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Expiring soon", value: "expiring" },
  { label: "Platform (A-Z)", value: "platform" },
];

const GROUP_OPTIONS: { label: string; value: GroupOption }[] = [
  { label: "No grouping", value: "none" },
  { label: "Platform", value: "platform" },
  { label: "Service", value: "service" },
  { label: "Status", value: "status" },
];

const STATUS_LABELS: Record<PromoStatus, string> = {
  active: "Active",
  expired: "Expired",
  unknown: "Unknown",
};

const STATUS_ORDER: PromoStatus[] = ["active", "unknown", "expired"];

function sortPromos(list: Promo[], sortBy: SortOption): Promo[] {
  const sorted = [...list];
  switch (sortBy) {
    case "newest":
      sorted.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
      break;
    case "oldest":
      sorted.sort((a, b) => a.firstSeen.localeCompare(b.firstSeen));
      break;
    case "expiring":
      sorted.sort((a, b) => {
        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return a.endDate.localeCompare(b.endDate);
      });
      break;
    case "platform":
      sorted.sort((a, b) => a.platform.localeCompare(b.platform));
      break;
  }
  return sorted;
}

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
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [groupBy, setGroupBy] = useState<GroupOption>("none");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      platforms: initialPlatform === "All" ? [] : [initialPlatform],
      services: initialService !== "All" ? [initialService] : [],
      bookmarkedOnly: initialBookmarked,
    }));
  }, [initialPlatform, initialService, initialBookmarked]);

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

  const sortedPromos = useMemo(
    () => sortPromos(filteredPromos, sortBy),
    [filteredPromos, sortBy]
  );

  const groupedPromos = useMemo(() => {
    if (groupBy === "none") return null;

    const groups = new Map<string, Promo[]>();
    for (const promo of sortedPromos) {
      const key =
        groupBy === "platform"
          ? promo.platform
          : groupBy === "service"
            ? promoServiceName(promo) ?? promo.platform
            : promo.status;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(promo);
    }

    const entries = Array.from(groups.entries());
    if (groupBy === "status") {
      entries.sort(
        ([a], [b]) =>
          STATUS_ORDER.indexOf(a as PromoStatus) - STATUS_ORDER.indexOf(b as PromoStatus)
      );
      return entries.map(([key, items]) => [STATUS_LABELS[key as PromoStatus], items] as const);
    }

    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries as [string, Promo[]][];
  }, [sortedPromos, groupBy]);

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
      services: initialService !== "All" ? [initialService] : [],
      bookmarkedOnly: initialBookmarked,
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
      const message = `Found ${payload.foundCount ?? 0}; saved ${payload.savedCount ?? 0}.${warnings}`;
      setScrapeMessage(message);
      toast({ title: message, variant: warnings ? "default" : "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Scrape failed";
      setScrapeMessage(message);
      toast({ title: message, variant: "error" });
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
        <div className="flex flex-wrap items-center gap-3 py-3 pl-14 pr-4 lg:px-6">
          <label className="relative min-w-[140px] flex-1 sm:max-w-md">
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

          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={runScrape} disabled={isScraping}>
              <RefreshCw className={isScraping ? "size-4 animate-spin" : "size-4"} />
              <span className="hidden sm:inline">{isScraping ? "Refreshing..." : "Refresh"}</span>
            </Button>

            <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2 lg:px-6">
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground" />
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              options={SORT_OPTIONS}
              className="h-8 w-[135px] text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <LayoutGrid className="size-3.5 shrink-0 text-muted-foreground" />
            <Select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupOption)}
              options={GROUP_OPTIONS}
              className="h-8 w-[135px] text-xs"
            />
          </div>
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
        {sortedPromos.length > 0 ? (
          groupedPromos ? (
            <div className="space-y-8">
              {groupedPromos.map(([label, items]) => (
                <div key={label}>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    {label}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                      {items.length}
                    </span>
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((promo) => (
                      <PromoCard key={promo.id} promo={promo} onUpdate={handlePromoUpdate} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedPromos.map((promo) => (
                <PromoCard key={promo.id} promo={promo} onUpdate={handlePromoUpdate} />
              ))}
            </div>
          )
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
          toast({ title: `Added ${promo.title}`, variant: "success" });
        }}
      />
    </main>
  );
}

"use client";

import { RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { PromoCard } from "@/components/promo-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PLATFORMS, type Platform, type Promo } from "@/lib/types";
import { isExpiringSoon } from "@/lib/date";
import { sourceSiteName } from "@/lib/source";
import { promoServiceName } from "@/lib/service";

const platformOptions = [
  { label: "All platforms", value: "All" },
  ...PLATFORMS.filter((platform) => platform !== "Other").map((platform) => ({
    label: platform,
    value: platform
  })),
  { label: "Other", value: "Other" }
];

export function PromoDashboard({ initialPromos }: { initialPromos: Promo[] }) {
  const [promos, setPromos] = useState(initialPromos);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<Platform | "All">("All");
  const [service, setService] = useState("All");
  const [source, setSource] = useState("All");
  const [activeOnly, setActiveOnly] = useState(true);
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [hasCodeOnly, setHasCodeOnly] = useState(false);
  const [workingFilter, setWorkingFilter] = useState<"All" | "Working" | "Not Working">("All");
  const [usedOnly, setUsedOnly] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);

  const serviceOptions = useMemo(() => {
    const services = Array.from(new Set(promos.map((promo) => promoServiceName(promo) ?? promo.platform))).sort();
    return [{ label: "All services", value: "All" }, ...services.map((value) => ({ label: value, value }))];
  }, [promos]);

  const sourceOptions = useMemo(() => {
    const sources = Array.from(new Set(promos.map((promo) => sourceSiteName(promo.sourceUrl)))).sort();
    return [{ label: "All sources", value: "All" }, ...sources.map((value) => ({ label: value, value }))];
  }, [promos]);

  const filteredPromos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return promos.filter((promo) => {
      const promoService = promoServiceName(promo) ?? promo.platform;
      const promoSource = sourceSiteName(promo.sourceUrl);
      const matchesQuery =
        !normalizedQuery ||
        [promo.title, promo.code, promo.description, promo.platform, promo.region, promoSource, promoService]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesPlatform = platform === "All" || promo.platform === platform;
      const matchesService = service === "All" || promoService === service;
      const matchesSource = source === "All" || promoSource === source;
      const matchesActive = !activeOnly || promo.status === "active";
      const matchesWorking =
        workingFilter === "All"
          ? true
          : workingFilter === "Working"
          ? promo.working === true
          : promo.working === false;
      const matchesUsed = !usedOnly || promo.used === true;
      const matchesExpiry = !expiringSoon || isExpiringSoon(promo.endDate);
      const matchesCode = !hasCodeOnly || Boolean(promo.code);

      return (
        matchesQuery &&
        matchesPlatform &&
        matchesService &&
        matchesSource &&
        matchesActive &&
        matchesWorking &&
        matchesUsed &&
        matchesExpiry &&
        matchesCode
      );
    });
  }, [activeOnly, expiringSoon, hasCodeOnly, workingFilter, usedOnly, platform, promos, query, service, source]);

  async function runScrape() {
    setIsScraping(true);
    setScrapeMessage(null);

    try {
      const response = await fetch("/api/scrape", { method: "POST" });
      const payload = (await response.json()) as {
        ok: boolean;
        foundCount?: number;
        savedCount?: number;
        promos?: Promo[];
        failures?: Array<{ scraper: string; message: string }>;
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Scrape failed");
      }

      setPromos(payload.promos ?? promos);

      const warningText = payload.failures?.length
        ? ` ${payload.failures.length} source${payload.failures.length === 1 ? "" : "s"} blocked or failed.`
        : "";
      setScrapeMessage(`Found ${payload.foundCount ?? 0}; saved ${payload.savedCount ?? 0}.${warningText}`);
    } catch (error) {
      setScrapeMessage(error instanceof Error ? error.message : "Scrape failed");
    } finally {
      setIsScraping(false);
    }
  }

  function handlePromoUpdate(updated: Promo) {
    setPromos((prevPromos) => prevPromos.map((p) => (p.id === updated.id ? updated : p)));
  }

  const activeCount = promos.filter((promo) => promo.status === "active").length;
  const lastUpdated = promos[0]?.lastSeen
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Manila"
      }).format(new Date(promos[0].lastSeen))
    : "Not scraped yet";

  return (
    <main className="min-h-screen">
      <section className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-primary">Philippines ride-hailing</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal sm:text-4xl">Promo codes and vouchers</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Private dashboard for Grab, Angkas, Move It, inDrive, and JoyRide discounts.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <Button type="button" onClick={runScrape} disabled={isScraping} className="w-full sm:w-auto">
                <RefreshCw className={isScraping ? "size-4 animate-spin" : "size-4"} aria-hidden />
                {isScraping ? "Scraping" : "Scrape"}
              </Button>
              {scrapeMessage ? (
                <p className="max-w-xs text-left text-xs leading-5 text-muted-foreground sm:text-right">{scrapeMessage}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center sm:max-w-md">
              <div className="rounded-md border bg-background px-3 py-2">
                <p className="text-lg font-semibold">{promos.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="rounded-md border bg-background px-3 py-2">
                <p className="text-lg font-semibold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="rounded-md border bg-background px-3 py-2">
                <p className="text-lg font-semibold">{filteredPromos.length}</p>
                <p className="text-xs text-muted-foreground">Shown</p>
              </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="size-4" aria-hidden />
              Filters
              <span className="ml-auto text-xs font-normal text-muted-foreground">Updated {lastUpdated}</span>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-center">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search platform, service, code, region, or details"
                  className="pl-9"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <Select
                  aria-label="Platform"
                  value={platform}
                  options={platformOptions}
                  onChange={(event) => setPlatform(event.target.value as Platform | "All")}
                />
                <Select
                  aria-label="Service"
                  value={service}
                  options={serviceOptions}
                  onChange={(event) => setService(event.target.value)}
                />
                <Select
                  aria-label="Source"
                  value={source}
                  options={sourceOptions}
                  onChange={(event) => setSource(event.target.value)}
                />
                <Select
                  aria-label="Working status"
                  value={workingFilter}
                  options={[
                    { label: "All", value: "All" },
                    { label: "Working", value: "Working" },
                    { label: "Not Working", value: "Not Working" }
                  ]}
                  onChange={(event) => setWorkingFilter(event.target.value as "All" | "Working" | "Not Working")}
                />
                <Checkbox
                  label="Active only"
                  checked={activeOnly}
                  onChange={(event) => setActiveOnly(event.target.checked)}
                />
                <Checkbox label="Used only" checked={usedOnly} onChange={(event) => setUsedOnly(event.target.checked)} />
                <Checkbox
                  label="Expiring soon"
                  checked={expiringSoon}
                  onChange={(event) => setExpiringSoon(event.target.checked)}
                />
                <Checkbox
                  label="Has code"
                  checked={hasCodeOnly}
                  onChange={(event) => setHasCodeOnly(event.target.checked)}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {filteredPromos.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredPromos.map((promo) => (
              <PromoCard key={promo.id} promo={promo} onUpdate={handlePromoUpdate} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed bg-white p-8 text-center">
            <div>
              <h2 className="text-lg font-semibold">No promos match these filters</h2>
              <p className="mt-2 text-sm text-muted-foreground">Try widening the platform or status filters.</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

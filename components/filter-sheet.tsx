"use client";

import { useEffect } from "react";
import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, type SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ALL_SERVICES } from "@/lib/service";
import type { Platform, Promo, PromoStatus } from "@/lib/types";

const PLATFORM_CHIPS: { value: Platform; label: string; bg: string; text: string; ring: string }[] = [
  { value: "Grab", label: "Grab", bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-400", ring: "ring-emerald-400 border-emerald-400" },
  { value: "Angkas", label: "Angkas", bg: "bg-cyan-50 dark:bg-cyan-950", text: "text-cyan-700 dark:text-cyan-400", ring: "ring-cyan-400 border-cyan-400" },
  { value: "Move It", label: "Move It", bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-400", ring: "ring-red-400 border-red-400" },
  { value: "inDrive", label: "inDrive", bg: "bg-lime-50 dark:bg-lime-950", text: "text-lime-700 dark:text-lime-400", ring: "ring-lime-400 border-lime-400" },
  { value: "JoyRide", label: "JoyRide", bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-400", ring: "ring-blue-400 border-blue-400" },
  { value: "Shopee", label: "Shopee", bg: "bg-orange-50 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-400", ring: "ring-orange-400 border-orange-400" },
  { value: "Lazada", label: "Lazada", bg: "bg-violet-50 dark:bg-violet-950", text: "text-violet-700 dark:text-violet-400", ring: "ring-violet-400 border-violet-400" },
  { value: "Foodpanda", label: "Foodpanda", bg: "bg-pink-50 dark:bg-pink-950", text: "text-pink-700 dark:text-pink-400", ring: "ring-pink-400 border-pink-400" },
  { value: "Other", label: "Other", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300", ring: "ring-slate-400 border-slate-400" },
];

const STATUS_CHIPS: { value: PromoStatus; label: string; bg: string; text: string; ring: string }[] = [
  { value: "active", label: "Active", bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-400", ring: "ring-emerald-400 border-emerald-400" },
  { value: "expired", label: "Inactive", bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-400", ring: "ring-red-400 border-red-400" },
  { value: "unknown", label: "Unverified", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300", ring: "ring-slate-400 border-slate-400" },
];

const TOGGLE_ITEMS = [
  { key: "hasCodeOnly", label: "Has code" },
  { key: "expiringSoon", label: "Expiring soon" },
  { key: "bookmarkedOnly", label: "Bookmarked" },
  { key: "usedOnly", label: "Used" },
] as const;

type NewUserFilter = "any" | "only" | "exclude";

interface FilterState {
  platforms: Platform[];
  services: string[];
  source: string;
  statuses: PromoStatus[];
  usedOnly: boolean;
  bookmarkedOnly: boolean;
  expiringSoon: boolean;
  hasCodeOnly: boolean;
  newUserFilter: NewUserFilter;
}

const NEW_USER_FILTER_OPTIONS: { value: NewUserFilter; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "only", label: "New users only" },
  { value: "exclude", label: "Exclude new-user-only" },
];

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  state: FilterState;
  onChange: (partial: Partial<FilterState>) => void;
  onReset: () => void;
  sourceOptions: SelectOption[];
  promos: Promo[];
}

function getVisibleServices(platforms: Platform[]): Array<{ platform: Platform; service: string }> {
  const targetPlatforms = platforms.length > 0
    ? platforms.filter((p): p is Exclude<Platform, "Other"> => p !== "Other")
    : (Object.keys(ALL_SERVICES) as Array<Exclude<Platform, "Other">>);

  return targetPlatforms.flatMap((p) =>
    ALL_SERVICES[p].map((s) => ({ platform: p as Platform, service: s }))
  );
}

export function FilterSheet({
  open,
  onClose,
  state,
  onChange,
  onReset,
  sourceOptions,
}: FilterSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const activeCount =
    state.platforms.length +
    state.services.length +
    (state.source !== "All" ? 1 : 0) +
    state.statuses.length +
    (state.usedOnly ? 1 : 0) +
    (state.bookmarkedOnly ? 1 : 0) +
    (state.expiringSoon ? 1 : 0) +
    (state.hasCodeOnly ? 1 : 0) +
    (state.newUserFilter !== "any" ? 1 : 0);

  const visibleServices = getVisibleServices(state.platforms);

  function togglePlatform(p: Platform) {
    const next = state.platforms.includes(p)
      ? state.platforms.filter((x) => x !== p)
      : [...state.platforms, p];
    const nextServices = state.services.filter((s) => {
      const stillVisible = getVisibleServices(next).some((vs) => `${vs.platform}::${vs.service}` === s);
      return stillVisible;
    });
    onChange({ platforms: next, services: nextServices });
  }

  function toggleStatus(s: PromoStatus) {
    const next = state.statuses.includes(s)
      ? state.statuses.filter((x) => x !== s)
      : [...state.statuses, s];
    onChange({ statuses: next });
  }

  function toggleService(s: string) {
    const next = state.services.includes(s)
      ? state.services.filter((x) => x !== s)
      : [...state.services, s];
    onChange({ services: next });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div className="relative z-50 flex h-full w-full max-w-xs flex-col border-l bg-background shadow-2xl animate-in slide-in-from-right">
        <div className="flex items-center justify-between border-b px-4 py-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Filters</h2>
            {activeCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-muted"
            aria-label="Close filters"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Platform
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORM_CHIPS.map((chip) => {
                const isActive = state.platforms.includes(chip.value);
                const color = PLATFORM_CHIPS.find((c) => c.value === chip.value)!;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => togglePlatform(chip.value)}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-sm font-medium transition-all",
                      color.bg, color.text,
                      isActive
                        ? `${color.ring} ring-1`
                        : "border-transparent opacity-50 hover:opacity-80"
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {visibleServices.length > 0 && (
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Services
              </label>
              <div className="flex flex-wrap gap-1.5">
                {visibleServices.map(({ platform, service }) => {
                  const value = `${platform}::${service}`;
                  const isActive = state.services.includes(value);
                  const color = PLATFORM_CHIPS.find((c) => c.value === platform)!;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleService(value)}
                      className={cn(
                        "rounded-md border px-2.5 py-1.5 text-sm font-medium transition-all",
                        color.bg, color.text,
                        isActive
                          ? `${color.ring} ring-1`
                          : "border-transparent opacity-50 hover:opacity-80"
                      )}
                    >
                      {service}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_CHIPS.map((chip) => {
                const isActive = state.statuses.includes(chip.value);
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => toggleStatus(chip.value)}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-sm font-medium transition-all",
                      chip.bg, chip.text,
                      isActive
                        ? `${chip.ring} ring-1`
                        : "border-transparent opacity-50 hover:opacity-80"
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Source
            </label>
            <Select
              aria-label="Source"
              value={state.source}
              options={sourceOptions}
              onChange={(e) => onChange({ source: e.target.value })}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              New user promos
            </label>
            <div className="flex flex-wrap gap-1.5">
              {NEW_USER_FILTER_OPTIONS.map((opt) => {
                const isActive = state.newUserFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ newUserFilter: opt.value })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input bg-background text-muted-foreground hover:border-muted-foreground/30"
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-0.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Filters
            </label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {TOGGLE_ITEMS.map(({ key, label }) => {
                const checked = state[key as keyof FilterState] as boolean;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChange({ [key]: !checked })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                      checked
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input bg-background text-muted-foreground hover:border-muted-foreground/30"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t p-4">
          <Button variant="ghost" onClick={onReset} className="w-full text-muted-foreground">
            <RotateCcw className="size-3.5" />
            Reset filters
          </Button>
        </div>
      </div>
    </div>
  );
}

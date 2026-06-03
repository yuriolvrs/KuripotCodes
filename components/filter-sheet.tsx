"use client";

import { useEffect } from "react";
import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, type SelectOption } from "@/components/ui/select";
import type { Platform, Promo } from "@/lib/types";

const PLATFORM_OPTIONS: SelectOption[] = [
  { label: "All platforms", value: "All" },
  { label: "Grab", value: "Grab" },
  { label: "Angkas", value: "Angkas" },
  { label: "Move It", value: "Move It" },
  { label: "inDrive", value: "inDrive" },
  { label: "JoyRide", value: "JoyRide" },
  { label: "Other", value: "Other" },
];

const WORKING_OPTIONS: SelectOption[] = [
  { label: "Any status", value: "All" },
  { label: "Working", value: "Working" },
  { label: "Not Working", value: "Not Working" },
];

interface FilterState {
  platform: Platform | "All";
  service: string;
  source: string;
  workingFilter: "All" | "Working" | "Not Working";
  activeOnly: boolean;
  usedOnly: boolean;
  bookmarkedOnly: boolean;
  expiringSoon: boolean;
  hasCodeOnly: boolean;
}

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  state: FilterState;
  onChange: (partial: Partial<FilterState>) => void;
  onReset: () => void;
  serviceOptions: SelectOption[];
  sourceOptions: SelectOption[];
  promos: Promo[];
}

export function FilterSheet({
  open,
  onClose,
  state,
  onChange,
  onReset,
  serviceOptions,
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative z-50 flex h-full w-full max-w-sm flex-col border-l bg-white shadow-xl animate-in slide-in-from-right">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted"
            aria-label="Close filters"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Platform
            </label>
            <Select
              aria-label="Platform"
              value={state.platform}
              options={PLATFORM_OPTIONS}
              onChange={(e) => onChange({ platform: e.target.value as Platform | "All" })}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Service
            </label>
            <Select
              aria-label="Service"
              value={state.service}
              options={serviceOptions}
              onChange={(e) => onChange({ service: e.target.value })}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Working Status
            </label>
            <Select
              aria-label="Working status"
              value={state.workingFilter}
              options={WORKING_OPTIONS}
              onChange={(e) => onChange({ workingFilter: e.target.value as "All" | "Working" | "Not Working" })}
              className="w-full"
            />
          </div>

          <div className="border-t pt-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Filters
            </label>
            <div className="mt-2 space-y-1">
              <Checkbox
                label="Active only"
                checked={state.activeOnly}
                onChange={(e) => onChange({ activeOnly: e.target.checked })}
              />
              <Checkbox
                label="Has promo code"
                checked={state.hasCodeOnly}
                onChange={(e) => onChange({ hasCodeOnly: e.target.checked })}
              />
              <Checkbox
                label="Expiring soon"
                checked={state.expiringSoon}
                onChange={(e) => onChange({ expiringSoon: e.target.checked })}
              />
              <Checkbox
                label="Bookmarked"
                checked={state.bookmarkedOnly}
                onChange={(e) => onChange({ bookmarkedOnly: e.target.checked })}
              />
              <Checkbox
                label="Used only"
                checked={state.usedOnly}
                onChange={(e) => onChange({ usedOnly: e.target.checked })}
              />
            </div>
          </div>
        </div>

        <div className="border-t p-4">
          <Button variant="outline" onClick={onReset} className="w-full">
            <RotateCcw className="size-4" />
            Reset all filters
          </Button>
        </div>
      </div>
    </div>
  );
}

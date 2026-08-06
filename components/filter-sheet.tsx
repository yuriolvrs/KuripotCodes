"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PLATFORMS, type Platform, type PromoStatus } from "@/lib/types";
import { PLATFORM_BRAND } from "@/lib/platform-colors";

const EXIT_DURATION_MS = 180;

const STATUS_CHIPS: { value: PromoStatus | "expiring"; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "expiring", label: "Ending soon" },
  { value: "expired", label: "Expired" },
  { value: "unknown", label: "Unconfirmed" }
];

export type FirstTimeOnlyFilter = "any" | "first_only" | "not_first_only";

const FIRST_TIME_ONLY_CHIPS: { value: FirstTimeOnlyFilter; label: string }[] = [
  { value: "first_only", label: "First-timers only" },
  { value: "not_first_only", label: "Not first-timers only" }
];

export interface BottomFilterState {
  platforms: Platform[];
  statuses: (PromoStatus | "expiring")[];
  sources: string[];
  firstTimeOnly: FirstTimeOnlyFilter;
}

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  state: BottomFilterState;
  onChange: (partial: Partial<BottomFilterState>) => void;
  onReset: () => void;
  sourceOptions: string[];
}

function chipClass(active: boolean) {
  return cn(
    "whitespace-nowrap rounded-full border-2 px-3.5 py-2 font-sans text-sm font-semibold transition-colors",
    active ? "border-ink bg-ink text-white" : "border-line bg-transparent text-ink"
  );
}

const platformChipBaseClass = "whitespace-nowrap rounded-full border-2 px-3.5 py-2 font-sans text-sm font-semibold transition-colors";

function platformChipStyle(platform: Platform, active: boolean): React.CSSProperties {
  const brand = PLATFORM_BRAND[platform];
  return active
    ? { borderColor: brand.color, backgroundColor: brand.color, color: brand.text }
    : { borderColor: brand.color, backgroundColor: "transparent", color: brand.color };
}

export function FilterSheet({ open, onClose, state, onChange, onReset, sourceOptions }: FilterSheetProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const timeout = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_DURATION_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!mounted) return null;

  function toggle<K extends keyof BottomFilterState>(key: K, value: string) {
    const arr = state[key] as string[];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    onChange({ [key]: next } as Partial<BottomFilterState>);
  }

  function toggleFirstTimeOnly(value: FirstTimeOnlyFilter) {
    onChange({ firstTimeOnly: state.firstTimeOnly === value ? "any" : value });
  }

  return (
    <>
      <div
        className={cn("fixed inset-0 z-[90] bg-ink/70", closing ? "animate-overlay-out" : "animate-overlay-in")}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[95] mx-auto flex max-h-[80vh] max-w-[640px] flex-col gap-4 overflow-y-auto border-[3px] border-b-0 border-ink bg-card p-5 shadow-[0_-6px_0_oklch(var(--ink))]",
          closing ? "animate-slide-down" : "animate-slide-up"
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl tracking-wide">MORE FILTERS</h2>
          <div className="flex gap-2.5">
            <button type="button" onClick={onReset} className="font-sans text-[13px] font-semibold text-brand">
              CLEAR ALL
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded font-display text-[13px] tracking-wide text-white"
              style={{ padding: "8px 16px", background: "oklch(var(--ink))" }}
            >
              DONE
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 font-display text-[13px] tracking-wider text-ink-soft">PLATFORM</div>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => toggle("platforms", p)}
                className={platformChipBaseClass}
                style={platformChipStyle(p, state.platforms.includes(p))}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 font-display text-[13px] tracking-wider text-ink-soft">STATUS</div>
          <div className="flex flex-wrap gap-2">
            {STATUS_CHIPS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => toggle("statuses", c.value)}
                className={chipClass(state.statuses.includes(c.value))}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 font-display text-[13px] tracking-wider text-ink-soft">FIRST-TIMERS</div>
          <div className="flex flex-wrap gap-2">
            {FIRST_TIME_ONLY_CHIPS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => toggleFirstTimeOnly(c.value)}
                className={chipClass(state.firstTimeOnly === c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {sourceOptions.length > 0 && (
          <div>
            <div className="mb-2 font-display text-[13px] tracking-wider text-ink-soft">SOURCE SITE</div>
            <div className="flex flex-wrap gap-2">
              {sourceOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggle("sources", s)}
                  className={chipClass(state.sources.includes(s))}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

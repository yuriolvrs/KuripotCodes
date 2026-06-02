"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PLATFORMS, type Platform, type DiscountType, type Promo } from "@/lib/types";
import { X } from "lucide-react";

const discountTypeOptions: { label: string; value: DiscountType | "" }[] = [
  { label: "None", value: "" },
  { label: "Percent", value: "percent" },
  { label: "Fixed", value: "fixed" },
  { label: "Free ride", value: "free_ride" },
  { label: "Unknown", value: "unknown" }
];

export function AddPromoModal({
  open,
  onOpenChange,
  onAdded
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: (promo: Promo) => void;
}) {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [platform, setPlatform] = useState<Platform>(PLATFORMS[0]);
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType | "">("");
  const [discountValue, setDiscountValue] = useState("");
  const [region, setRegion] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => titleInputRef.current?.focus(), 50);
    } else {
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  function reset() {
    setTitle("");
    setCode("");
    setPlatform(PLATFORMS[0]);
    setDescription("");
    setDiscountType("");
    setDiscountValue("");
    setRegion("");
    setSourceUrl("");
    setStartDate("");
    setEndDate("");
    setActive(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !code.trim() || !sourceUrl.trim()) {
      setError("Title, code, and source URL are required.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          code: code.trim(),
          platform,
          description: description.trim() || undefined,
          discountType: discountType || undefined,
          discountValue: discountValue.trim() || undefined,
          region: region.trim() || undefined,
          sourceUrl: sourceUrl.trim(),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          status: active ? "active" : "unknown"
        })
      });

      const payload = (await response.json()) as { ok: boolean; promo?: Promo; message?: string };

      if (!response.ok || !payload.ok || !payload.promo) {
        throw new Error(payload.message ?? "Failed to create promo");
      }

      onAdded?.(payload.promo);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create promo");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="relative w-full max-w-2xl rounded-lg border border-border bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Add new promo</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Title</span>
              <Input
                ref={titleInputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Promo title"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Code</span>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="PROMOCODE"
                required
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Platform</span>
              <select
                aria-label="Platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Region</span>
              <Input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Philippines"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Source URL</span>
            <Input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/promo"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details about the promo"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Discount type</span>
              <select
                aria-label="Discount type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType | "")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {discountTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Discount value</span>
              <Input
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="e.g. 10% or PHP 50"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Start date</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">End date</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>

          <Checkbox
            label="Mark as active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />

          {error ? (
            <p className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add promo"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

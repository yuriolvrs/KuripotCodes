"use client";

import { CalendarDays, Check, Copy, ExternalLink, MoreVertical, Star, Ticket } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Menu } from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import type { Platform, Promo } from "@/lib/types";
import { sourceSiteName } from "@/lib/source";
import { promoServiceName } from "@/lib/service";

const platformClasses: Record<Platform, string> = {
  Grab: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Angkas: "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Move It": "bg-yellow-50 text-yellow-800 border-yellow-200",
  inDrive: "bg-lime-50 text-lime-800 border-lime-200",
  JoyRide: "bg-rose-50 text-rose-700 border-rose-200",
  Other: "bg-slate-100 text-slate-700 border-slate-200"
};

function statusVariant(status: Promo["status"]) {
  if (status === "active") return "success";
  if (status === "expired") return "danger";
  return "muted";
}

export function PromoCard({ promo, onUpdate }: { promo: Promo; onUpdate?: (updated: Promo) => void }) {
  const [copied, setCopied] = useState(false);
  const [working, setWorking] = useState(promo.working);
  const [used, setUsed] = useState(promo.used);
  const [bookmarked, setBookmarked] = useState(promo.bookmarked);
  const [isUpdating, setIsUpdating] = useState(false);
  const sourceName = sourceSiteName(promo.sourceUrl);
  const serviceName = promoServiceName(promo);

  async function copyCode() {
    if (!promo.code) return;
    await navigator.clipboard.writeText(promo.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function toggleBookmark() {
    try {
      const newValue = !bookmarked;
      setBookmarked(newValue);
      const response = await fetch("/api/promo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promo.id, bookmarked: newValue })
      });

      if (!response.ok) {
        setBookmarked(!newValue);
        return;
      }

      const { promo: updated } = await response.json();
      onUpdate?.({ ...promo, ...updated });
    } catch (error) {
      setBookmarked(!bookmarked);
      console.error("Error bookmarking promo:", error);
    }
  }

  async function updatePromoStatus(field: "working" | "used", value: boolean | null) {
    try {
      setIsUpdating(true);
      const response = await fetch("/api/promo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promo.id, [field]: value })
      });

      if (!response.ok) throw new Error("Failed to update promo");

      const { promo: updated } = await response.json();
      if (field === "working") setWorking(value === null ? undefined : value);
      if (field === "used") setUsed(value === null ? undefined : value);
      onUpdate?.({ ...promo, ...updated });
    } catch (error) {
      console.error("Error updating promo:", error);
    } finally {
      setIsUpdating(false);
    }
  }

  const menuGroups = [
    {
      label: "Status",
      options: [
        {
          label: "Working",
          value: "working",
          active: working === true,
          onClick: () => updatePromoStatus("working", working === true ? null : true)
        },
        {
          label: "Not Working",
          value: "not-working",
          active: working === false,
          onClick: () => updatePromoStatus("working", working === false ? null : false)
        }
      ]
    },
    {
      label: "Usage",
      options: [
        {
          label: "Used",
          value: "used",
          active: used === true,
          onClick: () => updatePromoStatus("used", !used)
        }
      ]
    }
  ];

  return (
    <Card
      className={cn(
        "flex h-full flex-col overflow-hidden",
        used ? "bg-gray-50 text-muted-foreground" : working === true ? "bg-emerald-50" : working === false ? "bg-rose-50" : ""
      )}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-2">
            <Badge variant="outline" className={cn("shrink-0", platformClasses[promo.platform])}>
              {promo.platform}
            </Badge>
            {serviceName && serviceName !== promo.platform ? (
              <Badge variant="outline" className="shrink-0 border-slate-300 bg-white text-slate-700">
                {serviceName}
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleBookmark}
              title={bookmarked ? "Remove bookmark" : "Bookmark this promo"}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark this promo"}
              className="rounded p-0.5 hover:bg-black/5"
            >
              <Star className={bookmarked ? "size-4 fill-amber-400 text-amber-400" : "size-4 text-muted-foreground"} />
            </button>
            <div className="flex gap-1">
              {working !== undefined && (
                <Badge variant={working ? "success" : "danger"} className="text-xs">
                  {working ? "✓ Working" : "✗ Not Working"}
                </Badge>
              )}
              {used === true && (
                <Badge variant="secondary" className="text-xs">
                  ✓ Used
                </Badge>
              )}
            </div>
            <Menu groups={menuGroups} trigger={<MoreVertical className="size-4" />} />
            <Badge variant={statusVariant(promo.status)} className="capitalize">
              {promo.status}
            </Badge>
          </div>
        </div>
        <CardTitle>{promo.title}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {promo.description ? (
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{promo.description}</p>
        ) : null}

        <div className="mt-auto space-y-3">
          <div className="flex min-h-12 items-center justify-between gap-2 rounded-md border bg-muted/50 p-2">
            <div className="flex min-w-0 items-center gap-2">
              <Ticket className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="truncate font-mono text-sm font-semibold">{promo.code || "No code listed"}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copyCode}
              disabled={!promo.code}
              title={promo.code ? "Copy promo code" : "No promo code to copy"}
              aria-label={promo.code ? "Copy promo code" : "No promo code to copy"}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-2">
              <CalendarDays className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{promo.endDate ? `Expires ${promo.endDate}` : "Expiry unknown"}</span>
            </span>
            <Button asChild variant="ghost" size="sm">
              <a href={promo.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open promo source">
                {sourceName}
                <ExternalLink className="size-4" aria-hidden />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

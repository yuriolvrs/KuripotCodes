"use client";

import { CalendarDays, Check, Copy, ExternalLink, MoreVertical, Star } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Menu } from "@/components/ui/menu";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Platform, Promo } from "@/lib/types";
import { sourceSiteName } from "@/lib/source";
import { promoServiceName } from "@/lib/service";

const platformColors: Record<Platform, string> = {
  Grab: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  Angkas: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-400 dark:border-cyan-800",
  "Move It": "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  inDrive: "bg-lime-50 text-lime-800 border-lime-200 dark:bg-lime-950 dark:text-lime-400 dark:border-lime-800",
  JoyRide: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  Other: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

const platformDots: Record<Platform, string> = {
  Grab: "bg-emerald-500",
  Angkas: "bg-cyan-500",
  "Move It": "bg-red-500",
  inDrive: "bg-lime-500",
  JoyRide: "bg-blue-500",
  Other: "bg-slate-400",
};

function statusLabel(status: Promo["status"]) {
  if (status === "active") return "Active";
  if (status === "expired") return "Inactive";
  return "Unverified";
}

function statusVariant(status: Promo["status"]) {
  if (status === "active") return "success";
  if (status === "expired") return "danger";
  return "muted";
}

const DESCRIPTION_EXPAND_THRESHOLD = 110;

export function PromoCard({ promo, onUpdate }: { promo: Promo; onUpdate?: (updated: Promo) => void }) {
  const [copied, setCopied] = useState(false);
  const [working, setWorking] = useState(promo.working);
  const [used, setUsed] = useState(promo.used);
  const [bookmarked, setBookmarked] = useState(promo.bookmarked);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isBookmarkPending, setIsBookmarkPending] = useState(false);
  const [isFieldPending, setIsFieldPending] = useState(false);
  const sourceName = sourceSiteName(promo.sourceUrl);
  const serviceName = promoServiceName(promo);
  const { toast } = useToast();

  async function copyCode() {
    if (!promo.code) return;
    try {
      await navigator.clipboard.writeText(promo.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast({ title: "Couldn't copy code — copy it manually", variant: "error" });
    }
  }

  async function toggleBookmark() {
    setIsBookmarkPending(true);
    try {
      const newVal = !bookmarked;
      setBookmarked(newVal);
      const res = await fetch("/api/promo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promo.id, bookmarked: newVal }),
      });
      if (!res.ok) {
        setBookmarked(!newVal);
        toast({ title: "Couldn't update bookmark", variant: "error" });
        return;
      }
      const { promo: updated } = await res.json();
      onUpdate?.({ ...promo, ...updated });
    } catch {
      setBookmarked(!bookmarked);
      toast({ title: "Couldn't update bookmark", variant: "error" });
    } finally {
      setIsBookmarkPending(false);
    }
  }

  async function updateField(field: "working" | "used", value: boolean | null) {
    setIsFieldPending(true);
    try {
      const res = await fetch("/api/promo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promo.id, [field]: value }),
      });
      if (!res.ok) throw new Error("Failed");
      const { promo: updated } = await res.json();
      if (field === "working") setWorking(value === null ? undefined : value);
      if (field === "used") setUsed(value === null ? undefined : value);
      onUpdate?.({ ...promo, ...updated });
    } catch {
      toast({ title: `Couldn't update ${field} status`, variant: "error" });
    } finally {
      setIsFieldPending(false);
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
          onClick: () => updateField("working", working === true ? null : true),
        },
        {
          label: "Not Working",
          value: "not-working",
          active: working === false,
          onClick: () => updateField("working", working === false ? null : false),
        },
      ],
    },
    {
      label: "Usage",
      options: [
        {
          label: "Used",
          value: "used",
          active: used === true,
          onClick: () => updateField("used", !used),
        },
      ],
    },
  ];

  return (
    <Card
      className={cn(
        "group flex h-full flex-col transition-shadow hover:shadow-md",
        used && "bg-muted/40",
        working === true && "ring-1 ring-emerald-200",
        working === false && "ring-1 ring-red-200"
      )}
    >
      <CardHeader className="space-y-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className={cn("size-2 shrink-0 rounded-full", platformDots[promo.platform])} />
            <Badge variant="outline" className={cn("shrink-0 text-xs font-semibold", platformColors[promo.platform])}>
              {promo.platform}
            </Badge>
            {serviceName && serviceName !== promo.platform && (
              <Badge variant="muted" className="shrink-0 text-xs">
                {serviceName}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={toggleBookmark}
              disabled={isBookmarkPending}
              className="rounded p-1 hover:bg-muted disabled:opacity-50"
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
            >
              <Star
                className={cn(
                  "size-3.5 transition-colors",
                  bookmarked ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                )}
              />
            </button>
            <Menu
              groups={menuGroups}
              disabled={isFieldPending}
              trigger={
                <span className="flex size-7 items-center justify-center rounded hover:bg-muted">
                  <MoreVertical className="size-3.5 text-muted-foreground" />
                </span>
              }
            />
          </div>
        </div>

        <h3 className="text-sm font-semibold leading-snug">{promo.title}</h3>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        {promo.description && (
          <div>
            <p
              className={cn(
                "text-xs leading-relaxed text-muted-foreground",
                !descriptionExpanded && "line-clamp-2"
              )}
            >
              {promo.description}
            </p>
            {promo.description.length > DESCRIPTION_EXPAND_THRESHOLD && (
              <button
                type="button"
                onClick={() => setDescriptionExpanded((prev) => !prev)}
                className="mt-0.5 text-xs font-medium text-primary hover:underline"
              >
                {descriptionExpanded ? "Less" : "More"}
              </button>
            )}
          </div>
        )}

        <div className="mt-auto space-y-2.5">
          {promo.code && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/60 px-3 py-2">
              <code className="text-sm font-semibold tracking-wide">{promo.code}</code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={copyCode}
                className="h-7 px-2 text-xs"
              >
                {copied ? (
                  <Check className="size-3.5 text-emerald-600" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5 shrink-0" />
              {promo.endDate ? `Expires ${promo.endDate}` : "No expiry"}
            </span>

            {(working !== undefined || used) && (
              <span className="flex items-center gap-1.5">
                <span className="block h-1 w-1 rounded-full bg-border" />
                {working === true && (
                  <span className="font-medium text-emerald-600">Working</span>
                )}
                {working === false && (
                  <span className="font-medium text-red-600">Not working</span>
                )}
                {used && <span className="font-medium text-muted-foreground">Used</span>}
              </span>
            )}

            <span className="ml-auto flex items-center gap-1">
              <Badge variant={statusVariant(promo.status)} className="text-[10px]">
                {statusLabel(promo.status)}
              </Badge>
            </span>
          </div>

          <Button asChild variant="ghost" size="sm" className="h-7 w-full justify-start gap-1.5 text-xs text-muted-foreground">
            <a href={promo.sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3" />
              {sourceName}
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

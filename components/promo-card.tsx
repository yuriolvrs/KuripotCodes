"use client";

import { CalendarDays, Check, Copy, ExternalLink, Ticket } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function PromoCard({ promo }: { promo: Promo }) {
  const [copied, setCopied] = useState(false);
  const sourceName = sourceSiteName(promo.sourceUrl);
  const serviceName = promoServiceName(promo);

  async function copyCode() {
    if (!promo.code) return;
    await navigator.clipboard.writeText(promo.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden">
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
          <Badge variant={statusVariant(promo.status)} className="capitalize">
            {promo.status}
          </Badge>
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

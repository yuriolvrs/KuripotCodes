"use client";

import { useState } from "react";
import { Bookmark, SquareCheck, ThumbsUp } from "lucide-react";
import { Dialog, DialogCloseButton } from "@/components/ui/dialog";
import { StampButton } from "@/components/ui/stamp-button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Promo } from "@/lib/types";
import { sourceSiteName } from "@/lib/source";
import { promoServiceName } from "@/lib/service";
import { platformFamily } from "@/lib/family";
import { PLATFORM_BRAND } from "@/lib/platform-colors";
import { usePromoFlags } from "@/lib/use-promo-flags";
import {
  displayStatus,
  FAMILY_BADGE_FALLBACK,
  FAMILY_CLASSNAMES,
  FIRST_TIME_ONLY_CLASSNAMES,
  FIRST_TIME_ONLY_LABEL,
  serviceLabel,
  STATUS_CLASSNAMES,
  STATUS_LABELS
} from "@/lib/promo-display";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(iso)
  );
}

export function PromoDetailModal({
  promo,
  onClose,
  onUpdate
}: {
  promo: Promo | null;
  onClose: () => void;
  onUpdate?: (updated: Promo) => void;
}) {
  const [copied, setCopied] = useState(false);
  const { working, used, bookmarked, pending, updateField } = usePromoFlags(promo, onUpdate);
  const { toast } = useToast();

  if (!promo) return null;
  const current = promo;

  const sourceName = sourceSiteName(promo.sourceUrl);
  const service = promoServiceName(promo);
  const family = platformFamily(promo);
  const status = displayStatus(promo);

  async function copyCode() {
    if (!current.code) return;
    try {
      await navigator.clipboard.writeText(current.code);
      setCopied(true);
      toast({ title: `Copied ${current.code}` });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({ title: "Couldn't copy code — copy it manually", variant: "error" });
    }
  }

  return (
    <Dialog open={!!promo} onClose={onClose}>
      <DialogCloseButton onClick={onClose} />
      <div className="flex flex-col gap-3 p-6 pt-5">
        <div className="flex gap-2">
          <span
            className={cn(
              "rounded-[3px] px-2 py-0.5 font-display text-[11px] tracking-wider",
              family ? FAMILY_CLASSNAMES[family] : FAMILY_BADGE_FALLBACK
            )}
          >
            {(family ?? "other").toUpperCase()}
          </span>
          <span className={cn("rounded-[3px] px-2 py-0.5 font-display text-[11px] tracking-wider", STATUS_CLASSNAMES[status])}>
            {STATUS_LABELS[status].toUpperCase()}
          </span>
          {promo.firstTimeOnly && (
            <span
              className={cn(
                "rounded-[3px] px-2 py-0.5 font-display text-[11px] tracking-wider",
                FIRST_TIME_ONLY_CLASSNAMES
              )}
            >
              {FIRST_TIME_ONLY_LABEL.toUpperCase()}
            </span>
          )}
        </div>

        <div
          className="font-display text-sm tracking-wide"
          style={{ color: PLATFORM_BRAND[promo.platform].textOnLight }}
        >
          {serviceLabel(promo.platform, service)}
        </div>

        <h2 className="pr-6 font-display text-2xl leading-tight">{promo.title}</h2>

        {promo.description && <p className="text-sm leading-relaxed text-ink-soft">{promo.description}</p>}

        <div className="mt-1 flex flex-wrap items-center gap-2.5">
          {promo.code && (
            <span className="rounded-[3px] border-2 border-dashed border-ink bg-paper px-3.5 py-2 font-mono text-xl font-bold tracking-wide">
              {promo.code}
            </span>
          )}
          {promo.discountValue && <span className="font-display text-[15px] text-brand">{promo.discountValue}</span>}
          {promo.code && (
            <button
              type="button"
              onClick={copyCode}
              className={cn(
                "rounded-[3px] border-2 px-4 py-2.5 font-display text-[13px] tracking-wide shadow-[2px_2px_0_oklch(var(--ink))]",
                copied ? "border-status-active bg-status-active text-white" : "border-brand bg-brand text-brand-foreground"
              )}
            >
              {copied ? "COPIED" : "COPY"}
            </button>
          )}
        </div>

        <div className="mt-1.5 grid grid-cols-2 gap-2.5 text-[13px] text-ink-soft">
          <div>
            <b className="text-ink">Source</b>
            <br />
            {sourceName}
          </div>
          <div>
            <b className="text-ink">First seen</b>
            <br />
            {formatDate(promo.firstSeen)}
          </div>
          <div>
            <b className="text-ink">Last seen</b>
            <br />
            {formatDate(promo.lastSeen)}
          </div>
        </div>

        <div className="mt-2 flex gap-3.5 border-t-2 border-dashed border-line pt-3.5">
          <StampButton
            glyph={<Bookmark className={cn(bookmarked === true && "fill-current")} />}
            label="Bookmarked"
            showLabel
            active={bookmarked === true}
            disabled={pending}
            activeClassName="border-[oklch(55%_0.15_85)] bg-[oklch(80%_0.16_88)] text-white"
            onClick={() => updateField("bookmarked", bookmarked ? null : true)}
          />
          <StampButton
            glyph={<ThumbsUp className={cn(working === true && "fill-current")} />}
            label="Working"
            showLabel
            active={working === true}
            disabled={pending}
            activeClassName="border-status-active bg-status-active text-white"
            onClick={() => updateField("working", working === true ? null : true)}
          />
          <StampButton
            glyph={<SquareCheck />}
            label="Used"
            showLabel
            active={used === true}
            disabled={pending}
            activeClassName="border-ink bg-ink text-white"
            onClick={() => updateField("used", used ? null : true)}
          />
        </div>
      </div>
    </Dialog>
  );
}

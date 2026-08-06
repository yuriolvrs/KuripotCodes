"use client";

import { useState } from "react";
import { Bookmark, SquareCheck, ThumbsUp } from "lucide-react";
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

export function PromoCard({
  promo,
  onUpdate,
  onOpen
}: {
  promo: Promo;
  onUpdate?: (updated: Promo) => void;
  onOpen: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { working, used, bookmarked, pending, updateField } = usePromoFlags(promo, onUpdate);
  const { toast } = useToast();

  const sourceName = sourceSiteName(promo.sourceUrl);
  const service = promoServiceName(promo);
  const family = platformFamily(promo);
  const status = displayStatus(promo);

  async function copyCode(e: React.MouseEvent) {
    e.stopPropagation();
    if (!promo.code) return;
    try {
      await navigator.clipboard.writeText(promo.code);
      setCopied(true);
      toast({ title: `Copied ${promo.code}` });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({ title: "Couldn't copy code — copy it manually", variant: "error" });
    }
  }

  return (
    <div
      onClick={onOpen}
      className="relative flex cursor-pointer flex-col rounded border-2 border-ink bg-card shadow-[4px_4px_0_oklch(84%_0.015_60)]"
    >
      <div className="flex flex-col gap-2 p-4 pb-4">
        <div className="flex items-center justify-between gap-2">
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
        </div>

        {promo.firstTimeOnly && (
          <span
            className={cn(
              "w-fit rounded-[3px] px-2 py-0.5 font-display text-[11px] tracking-wider",
              FIRST_TIME_ONLY_CLASSNAMES
            )}
          >
            {FIRST_TIME_ONLY_LABEL.toUpperCase()}
          </span>
        )}

        <div
          className="font-display text-[13px] tracking-wide"
          style={{ color: PLATFORM_BRAND[promo.platform].textOnLight }}
        >
          {serviceLabel(promo.platform, service)}
        </div>

        <h3 className="line-clamp-2 text-base font-semibold leading-snug">{promo.title}</h3>

        {promo.description && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-soft">{promo.description}</p>
        )}
      </div>

      <div className="relative border-t-2 border-dashed border-line">
        <div className="absolute -left-[10px] -top-[9px] size-[18px] rounded-full border-2 border-ink bg-paper" />
        <div className="absolute -right-[10px] -top-[9px] size-[18px] rounded-full border-2 border-ink bg-paper" />
      </div>

      <div className="flex flex-col gap-2.5 p-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-baseline gap-2">
            {promo.code && (
              <span className="rounded-[3px] border-2 border-dashed border-ink bg-paper px-2 py-1 font-mono text-base font-bold tracking-wide">
                {promo.code}
              </span>
            )}
            {promo.discountValue && (
              <span className="font-display text-[13px] text-brand">{promo.discountValue}</span>
            )}
          </div>
          {promo.code && (
            <button
              type="button"
              onClick={copyCode}
              className={cn(
                "whitespace-nowrap rounded-[3px] border-2 px-3.5 py-2 font-display text-xs tracking-wide shadow-[2px_2px_0_oklch(var(--ink))]",
                copied ? "border-status-active bg-status-active text-white" : "border-brand bg-brand text-brand-foreground"
              )}
            >
              {copied ? "COPIED" : "COPY"}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="truncate font-mono text-[11px] text-ink-soft">{sourceName}</div>
          <div className="flex gap-1.5">
            <StampButton
              glyph={<Bookmark className={cn(bookmarked === true && "fill-current")} />}
              label="Bookmark"
              active={bookmarked === true}
              disabled={pending}
              activeClassName="border-[oklch(55%_0.15_85)] bg-[oklch(80%_0.16_88)] text-white"
              onClick={() => updateField("bookmarked", bookmarked ? null : true)}
            />
            <StampButton
              glyph={<ThumbsUp className={cn(working === true && "fill-current")} />}
              label="Working"
              active={working === true}
              disabled={pending}
              activeClassName="border-status-active bg-status-active text-white"
              onClick={() => updateField("working", working === true ? null : true)}
            />
            <StampButton
              glyph={<SquareCheck />}
              label="Used"
              active={used === true}
              disabled={pending}
              activeClassName="border-ink bg-ink text-white"
              onClick={() => updateField("used", used ? null : true)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

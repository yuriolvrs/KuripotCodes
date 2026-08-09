"use client";

import { useEffect, useState } from "react";
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
  FAMILY_ICONS,
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
  // Keep rendering the last-open promo's content while the dialog plays its
  // close animation — bailing out to null the instant `promo` goes null would
  // unmount Dialog before it gets to animate out.
  const [displayPromo, setDisplayPromo] = useState(promo);
  useEffect(() => {
    if (promo) {
      setDisplayPromo(promo);
      setCopied(false);
    }
  }, [promo]);
  const { working, used, bookmarked, pending, updateField } = usePromoFlags(displayPromo, onUpdate);
  const { toast } = useToast();

  if (!displayPromo) return null;
  const current = displayPromo;

  const sourceName = sourceSiteName(current.sourceUrl);
  const service = promoServiceName(current);
  const family = platformFamily(current);
  const status = displayStatus(current);

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
              "flex items-center gap-1 rounded-[3px] px-2 py-0.5 font-display text-[11px] tracking-wider",
              family ? FAMILY_CLASSNAMES[family] : FAMILY_BADGE_FALLBACK
            )}
          >
            {family && (() => {
              const Icon = FAMILY_ICONS[family];
              return <Icon className="size-3 shrink-0" strokeWidth={2.5} />;
            })()}
            {(family ?? "other").toUpperCase()}
          </span>
          <span className={cn("rounded-[3px] px-2 py-0.5 font-display text-[11px] tracking-wider", STATUS_CLASSNAMES[status])}>
            {STATUS_LABELS[status].toUpperCase()}
          </span>
          {current.firstTimeOnly && (
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
          style={{ color: PLATFORM_BRAND[current.platform].textOnLight }}
        >
          {serviceLabel(current.platform, service)}
        </div>

        <h2 className="pr-6 font-display text-2xl leading-tight">{current.title}</h2>

        {current.description && <p className="text-sm leading-relaxed text-ink-soft">{current.description}</p>}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-baseline gap-2.5">
            {current.code && (
              <span className="rounded-[3px] border-2 border-dashed border-ink bg-paper px-3.5 py-2 font-mono text-xl font-bold tracking-wide">
                {current.code}
              </span>
            )}
            {current.discountValue && <span className="font-display text-[15px] text-brand">{current.discountValue}</span>}
          </div>
          {current.code && (
            <button
              type="button"
              onClick={copyCode}
              className={cn(
                "whitespace-nowrap rounded-[3px] border-2 px-4 py-2.5 font-display text-[13px] tracking-wide shadow-[2px_2px_0_oklch(var(--ink))]",
                copied ? "border-status-active bg-status-active text-white" : "border-brand bg-brand text-brand-foreground"
              )}
            >
              {copied ? "COPIED" : "COPY"}
            </button>
          )}
        </div>

        <div className="mt-1.5 grid grid-cols-3 gap-2.5 text-[13px] text-ink-soft">
          <div>
            <b className="text-ink">Source</b>
            <br />
            <a
              href={current.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted underline-offset-2 hover:text-brand"
            >
              {sourceName}
            </a>
          </div>
          <div>
            <b className="text-ink">First seen</b>
            <br />
            {formatDate(current.firstSeen)}
          </div>
          <div>
            <b className="text-ink">Last seen</b>
            <br />
            {formatDate(current.lastSeen)}
          </div>
        </div>

        <div className="mt-2 flex justify-center gap-4 border-t-2 border-dashed border-line pt-3.5">
          <StampButton
            glyph={<Bookmark className={cn(bookmarked === true && "fill-current")} />}
            label={bookmarked === true ? "Bookmarked" : "Bookmark?"}
            showLabel
            active={bookmarked === true}
            disabled={pending}
            activeClassName="border-[oklch(55%_0.15_85)] bg-[oklch(80%_0.16_88)] text-white"
            onClick={() => updateField("bookmarked", bookmarked ? null : true)}
          />
          <StampButton
            glyph={<ThumbsUp className={cn(working === true && "fill-current")} />}
            label={working === true ? "Working" : "Working?"}
            showLabel
            active={working === true}
            disabled={pending}
            activeClassName="border-status-active bg-status-active text-white"
            onClick={() => updateField("working", working === true ? null : true)}
          />
          <StampButton
            glyph={<SquareCheck />}
            label={used === true ? "Used" : "Used?"}
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

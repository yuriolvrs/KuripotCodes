"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StampButtonProps {
  active: boolean;
  glyph: ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  activeClassName: string;
  showLabel?: boolean;
}

export function StampButton({
  active,
  glyph,
  label,
  onClick,
  disabled,
  activeClassName,
  showLabel
}: StampButtonProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1.5", showLabel && "w-[72px]")}>
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onClick(e);
        }}
        className={cn(
          "flex size-[30px] items-center justify-center rounded border-2 transition-transform disabled:opacity-50 [&_svg]:size-4 [backface-visibility:hidden] [transform-style:preserve-3d]",
          active
            ? cn(activeClassName, "-rotate-[8deg]")
            : "border-line bg-card text-ink hover:border-ink"
        )}
      >
        {glyph}
      </button>
      {showLabel && <span className="text-[11px] text-ink-soft">{label}</span>}
    </div>
  );
}

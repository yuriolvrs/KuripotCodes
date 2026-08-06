"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function Checkbox({ className, label, checked, onChange, ...props }: CheckboxProps) {
  return (
    <label className="inline-flex w-full cursor-pointer items-center gap-2.5 rounded px-2 py-2 text-sm text-ink hover:bg-muted/50">
      <span className="relative grid size-5 shrink-0 place-items-center rounded border-2 border-ink bg-card">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className={cn("peer absolute inset-0 cursor-pointer opacity-0", className)}
          {...props}
        />
        <Check className="size-3.5 text-brand opacity-0 peer-checked:opacity-100" aria-hidden />
      </span>
      {label}
    </label>
  );
}

"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function Checkbox({ className, label, checked, onChange, ...props }: CheckboxProps) {
  return (
    <label className="inline-flex min-h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium">
      <span className="relative grid size-4 place-items-center rounded border border-input bg-white">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className={cn("peer absolute inset-0 cursor-pointer opacity-0", className)}
          {...props}
        />
        <Check className="size-3 text-primary opacity-0 peer-checked:opacity-100" aria-hidden />
      </span>
      {label}
    </label>
  );
}

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

export function Select({ className, options, ...props }: SelectProps) {
  return (
    <span className="relative inline-flex w-full">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded border-2 border-ink bg-card px-3 pr-9 font-sans text-sm font-medium text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-brand focus-visible:ring-offset-1",
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
    </span>
  );
}

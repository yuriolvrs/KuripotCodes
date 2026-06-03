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
          "h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  );
}

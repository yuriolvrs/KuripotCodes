"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import type { Promo } from "@/lib/types";

type Flag = "working" | "used" | "bookmarked";

export function usePromoFlags(promo: Promo | null | undefined, onUpdate?: (updated: Promo) => void) {
  const [pending, setPending] = useState(false);
  const { toast } = useToast();

  // Flags are derived straight from the `promo` prop rather than mirrored into
  // local state, so every consumer sharing the same underlying promo (a card
  // and the detail modal, for instance) stays in sync through the same
  // `onUpdate` callback instead of drifting apart.
  const working = promo?.working;
  const used = promo?.used;
  const bookmarked = promo?.bookmarked;

  async function updateField(field: Flag, value: boolean | null) {
    if (!promo) return;
    setPending(true);
    const optimistic = { ...promo };
    if (value === null) delete optimistic[field];
    else optimistic[field] = value;
    onUpdate?.(optimistic);
    try {
      const res = await fetch("/api/promo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promo.id, [field]: value })
      });
      if (!res.ok) throw new Error("Failed");
      const { promo: updated } = await res.json();
      onUpdate?.(updated);
    } catch {
      onUpdate?.(promo);
      toast({ title: `Couldn't update ${field}`, variant: "error" });
    } finally {
      setPending(false);
    }
  }

  return { working, used, bookmarked, pending, updateField };
}

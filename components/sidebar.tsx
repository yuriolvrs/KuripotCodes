"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bike, Bookmark, Car, LayoutDashboard, Menu, ShoppingCart, Ticket, X, Zap } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "All Promos", color: "bg-primary" },
  { href: "/grab", label: "Grab", color: "bg-emerald-500" },
  { href: "/angkas", label: "Angkas", color: "bg-cyan-500" },
  { href: "/move-it", label: "Move It", color: "bg-yellow-500" },
  { href: "/indrive", label: "inDrive", color: "bg-lime-500" },
  { href: "/joyride", label: "JoyRide", color: "bg-rose-500" },
] as const;

const platformIcons: Record<string, React.ReactNode> = {
  "/": <LayoutDashboard className="size-4" />,
  "/grab": <ShoppingCart className="size-4" />,
  "/angkas": <Bike className="size-4" />,
  "/move-it": <Zap className="size-4" />,
  "/indrive": <Car className="size-4" />,
  "/joyride": <Car className="size-4" />,
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary">
          <Ticket className="size-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold">Ride Promos</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Platforms
        </p>
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <span className={cn("size-2 shrink-0 rounded-full", item.color)} />
              <span className="flex items-center gap-2.5">
                {platformIcons[item.href]}
                {item.label}
              </span>
            </Link>
          );
        })}

        <div className="mx-3 my-3 border-t" />

        <Link
          href="/?bookmarked=1"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Bookmark className="size-4" />
          Bookmarked
        </Link>
      </nav>

      <div className="border-t p-3">
        <p className="px-2 text-[11px] text-muted-foreground">
          PH Ride Promo Aggregator
        </p>
      </div>
    </>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fixed left-3 top-3 z-50 rounded-md border bg-white p-2 lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="size-4" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r bg-white transition-transform lg:relative lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-md p-1 hover:bg-muted lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="size-4" />
        </button>
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </aside>
    </>
  );
}

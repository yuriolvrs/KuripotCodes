"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bike, Bookmark, Car, ChevronDown, Gift, Infinity,
  LayoutDashboard, Menu, Package, ShoppingBag, ShoppingCart,
  Ticket, UtensilsCrossed, X
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const grabServices = [
  { href: "/grab?service=GrabCar", label: "GrabCar", icon: <Car className="size-3.5" /> },
  { href: "/grab?service=GrabFood", label: "GrabFood", icon: <UtensilsCrossed className="size-3.5" /> },
  { href: "/grab?service=GrabMart", label: "GrabMart", icon: <ShoppingCart className="size-3.5" /> },
  { href: "/grab?service=GrabExpress", label: "GrabExpress", icon: <Package className="size-3.5" /> },
  { href: "/grab?service=GrabUnlimited", label: "GrabUnlimited", icon: <Infinity className="size-3.5" /> },
  { href: "/grab?service=GrabGifts", label: "GrabGifts", icon: <Gift className="size-3.5" /> },
];

const navItems = [
  { href: "/", label: "All Promos", color: "bg-primary", children: undefined },
  { href: "/grab", label: "Grab", color: "bg-emerald-500", children: grabServices },
  { href: "/angkas", label: "Angkas", color: "bg-cyan-500", children: undefined },
  { href: "/indrive", label: "inDrive", color: "bg-lime-500", children: undefined },
  { href: "/move-it", label: "Move It", color: "bg-red-500", children: undefined },
  { href: "/joyride", label: "JoyRide", color: "bg-blue-500", children: undefined },
] as const;

const platformIcons: Record<string, React.ReactNode> = {
  "/": <LayoutDashboard className="size-4" />,
  "/grab": <ShoppingBag className="size-4" />,
  "/angkas": <Bike className="size-4" />,
  "/indrive": <Car className="size-4" />,
  "/move-it": <Bike className="size-4" />,
  "/joyride": <Bike className="size-4" />,
};

function isServiceActive(childHref: string, pathname: string, service: string | null) {
  const [base, qs] = childHref.split("?");
  if (pathname !== base) return false;
  const childParams = new URLSearchParams(qs);
  return childParams.get("service") === service;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <div className="flex h-[61px] items-center gap-2 border-b px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary">
          <Ticket className="size-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold">KuripotCodes</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Platforms
        </p>
        {navItems.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

          return (
            <div key={item.href}>
              {item.children ? (
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === item.href ? null : item.href)}
                  className={cn(
                    "mb-0.5 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <span className={cn("size-2 shrink-0 rounded-full", item.color)} />
                  <span className="flex flex-1 items-center gap-2.5">
                    {platformIcons[item.href]}
                    {item.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 shrink-0 transition-transform",
                      expanded === item.href && "rotate-180"
                    )}
                  />
                </button>
              ) : (
                <Link
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
              )}

              {item.children && expanded === item.href && (
                <div className="mb-1 ml-9 space-y-0.5">
                  {item.children.map((child) => {
                    const childActive = isServiceActive(
                        child.href,
                        pathname,
                        searchParams.get("service")
                      );
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors",
                          childActive
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground/80 hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        {child.icon}
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className="mx-3 my-3 border-t" />

        <Link
          href="/?bookmarked=1"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            searchParams.get("bookmarked") === "1"
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
          "fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
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

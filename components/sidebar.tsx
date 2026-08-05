"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bike, Bookmark, Bus, Car, ChevronDown, Coins,
  Gift, Infinity, LayoutDashboard, Menu, Package, Plane,
  ShoppingBag, ShoppingCart, Store, Ticket, Truck, UtensilsCrossed, Wallet, X
} from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const grabServices = [
  { href: "/grab?service=GrabCar", label: "GrabCar", icon: <Car className="size-3.5" /> },
  { href: "/grab?service=GrabFood", label: "GrabFood", icon: <UtensilsCrossed className="size-3.5" /> },
  { href: "/grab?service=GrabMart", label: "GrabMart", icon: <ShoppingCart className="size-3.5" /> },
  { href: "/grab?service=GrabExpress", label: "GrabExpress", icon: <Package className="size-3.5" /> },
  { href: "/grab?service=GrabUnlimited", label: "GrabUnlimited", icon: <Infinity className="size-3.5" /> },
  { href: "/grab?service=GrabGifts", label: "GrabGifts", icon: <Gift className="size-3.5" /> },
];

const angkasServices = [
  { href: "/angkas?service=Motorcycle", label: "Motorcycle", icon: <Bike className="size-3.5" /> },
  { href: "/angkas?service=Padala", label: "Padala", icon: <Package className="size-3.5" /> },
  { href: "/angkas?service=AngCars", label: "AngCars", icon: <Car className="size-3.5" /> },
];

const indriveServices = [
  { href: "/indrive?service=City rides", label: "City rides", icon: <Car className="size-3.5" /> },
  { href: "/indrive?service=Groceries", label: "Groceries", icon: <ShoppingCart className="size-3.5" /> },
  { href: "/indrive?service=Couriers", label: "Couriers", icon: <Package className="size-3.5" /> },
];

const joyrideServices = [
  { href: "/joyride?service=MC Taxi", label: "MC Taxi", icon: <Bike className="size-3.5" /> },
  { href: "/joyride?service=Car", label: "Car", icon: <Car className="size-3.5" /> },
  { href: "/joyride?service=Taxi Cab", label: "Taxi Cab", icon: <Car className="size-3.5" /> },
  { href: "/joyride?service=Bus", label: "Bus", icon: <Bus className="size-3.5" /> },
  { href: "/joyride?service=Airport Transfer", label: "Airport Transfer", icon: <Plane className="size-3.5" /> },
  { href: "/joyride?service=RentaCar", label: "RentaCar", icon: <Car className="size-3.5" /> },
  { href: "/joyride?service=Delivery", label: "Delivery", icon: <Package className="size-3.5" /> },
  { href: "/joyride?service=HappyMove", label: "HappyMove", icon: <Truck className="size-3.5" /> },
  { href: "/joyride?service=Pabili", label: "Pabili", icon: <ShoppingCart className="size-3.5" /> },
  { href: "/joyride?service=Load", label: "Load", icon: <Coins className="size-3.5" /> },
];

const shopeeServices = [
  { href: "/shopee?service=ShopeeMall", label: "ShopeeMall", icon: <Store className="size-3.5" /> },
  { href: "/shopee?service=ShopeeFood", label: "ShopeeFood", icon: <UtensilsCrossed className="size-3.5" /> },
  { href: "/shopee?service=ShopeePay", label: "ShopeePay", icon: <Wallet className="size-3.5" /> },
  { href: "/shopee?service=Free Shipping", label: "Free Shipping", icon: <Truck className="size-3.5" /> },
  { href: "/shopee?service=Cashback", label: "Cashback", icon: <Coins className="size-3.5" /> },
];

const lazadaServices = [
  { href: "/lazada?service=LazMall", label: "LazMall", icon: <Store className="size-3.5" /> },
  { href: "/lazada?service=LazWallet", label: "LazWallet", icon: <Wallet className="size-3.5" /> },
  { href: "/lazada?service=Free Shipping", label: "Free Shipping", icon: <Truck className="size-3.5" /> },
  { href: "/lazada?service=Cashback", label: "Cashback", icon: <Coins className="size-3.5" /> },
];

const foodpandaServices = [
  { href: "/foodpanda?service=pandamart", label: "pandamart", icon: <ShoppingCart className="size-3.5" /> },
  { href: "/foodpanda?service=pandapro", label: "pandapro", icon: <Gift className="size-3.5" /> },
  { href: "/foodpanda?service=Restaurant Delivery", label: "Restaurant Delivery", icon: <UtensilsCrossed className="size-3.5" /> },
  { href: "/foodpanda?service=Free Delivery", label: "Free Delivery", icon: <Truck className="size-3.5" /> },
];

const navItems = [
  { href: "/", label: "All Promos", color: "bg-primary", children: undefined },
  { href: "/grab", label: "Grab", color: "bg-emerald-500", children: grabServices },
  { href: "/angkas", label: "Angkas", color: "bg-cyan-500", children: angkasServices },
  { href: "/indrive", label: "inDrive", color: "bg-lime-500", children: indriveServices },
  { href: "/move-it", label: "Move It", color: "bg-red-500", children: undefined },
  { href: "/joyride", label: "JoyRide", color: "bg-blue-500", children: joyrideServices },
  { href: "/shopee", label: "Shopee", color: "bg-orange-500", children: shopeeServices },
  { href: "/lazada", label: "Lazada", color: "bg-violet-500", children: lazadaServices },
  { href: "/foodpanda", label: "Foodpanda", color: "bg-pink-500", children: foodpandaServices },
] as const;

const platformIcons: Record<string, React.ReactNode> = {
  "/": <LayoutDashboard className="size-4" />,
  "/grab": <ShoppingBag className="size-4" />,
  "/angkas": <Bike className="size-4" />,
  "/indrive": <Car className="size-4" />,
  "/move-it": <Bike className="size-4" />,
  "/joyride": <Bike className="size-4" />,
  "/shopee": <Store className="size-4" />,
  "/lazada": <Store className="size-4" />,
  "/foodpanda": <UtensilsCrossed className="size-4" />,
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

  useEffect(() => {
    const activeItem = navItems.find((item) =>
      item.children && pathname.startsWith(item.href)
    );
    if (activeItem) {
      setExpanded(activeItem.href);
    }
  }, [pathname]);

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
                <div
                  className={cn(
                    "mb-0.5 flex items-center gap-0 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className="flex flex-1 items-center gap-3 px-3 py-2"
                  >
                    <span className={cn("size-2 shrink-0 rounded-full", item.color)} />
                    <span className="flex items-center gap-2.5">
                      {platformIcons[item.href]}
                      {item.label}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === item.href ? null : item.href)}
                    className="px-2 py-2"
                  >
                    <ChevronDown
                      className={cn(
                        "size-3.5 shrink-0 transition-transform",
                        expanded === item.href && "rotate-180"
                      )}
                    />
                  </button>
                </div>
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
                          "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
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
        <ThemeToggle />
        <p className="mt-2 px-2 text-[11px] text-muted-foreground">
          PH Promo Code Aggregator
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
        className="fixed left-3 top-3 z-50 rounded-md border bg-background p-2 lg:hidden"
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
          "fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r bg-background transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
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

import { Suspense } from "react";
import { PromoDashboard } from "@/components/promo-dashboard";
import { loadPromos } from "@/lib/storage";
import type { Platform } from "@/lib/types";

export const dynamic = "force-dynamic";

const SLUG_MAP: Record<string, Platform> = {
  grab: "Grab",
  angkas: "Angkas",
  "move-it": "Move It",
  indrive: "inDrive",
  joyride: "JoyRide",
};

export async function generateStaticParams() {
  return Object.keys(SLUG_MAP).map((slug) => ({ slug }));
}

export default async function PlatformPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const promos = await loadPromos();
  const { slug } = await params;
  const sp = await searchParams;
  const platform = SLUG_MAP[slug];

  if (!platform) {
    return (
      <div className="flex min-h-64 items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Unknown platform</h2>
          <p className="mt-1 text-sm text-muted-foreground">The platform &quot;{slug}&quot; is not supported.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense>
      <PromoDashboard
        initialPromos={promos}
        initialPlatform={platform}
        initialService={sp.service ?? "All"}
      />
    </Suspense>
  );
}

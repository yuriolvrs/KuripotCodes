import { Suspense } from "react";
import { PromoDashboard } from "@/components/promo-dashboard";
import { loadPromos } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ bookmarked?: string; service?: string }>;
}) {
  const promos = await loadPromos();
  const params = await searchParams;
  return (
    <Suspense>
      <PromoDashboard
        initialPromos={promos}
        initialPlatform="All"
        initialBookmarked={params.bookmarked === "1"}
        initialService={params.service ?? "All"}
      />
    </Suspense>
  );
}

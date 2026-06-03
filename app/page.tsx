import { PromoDashboard } from "@/components/promo-dashboard";
import { loadPromos } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ bookmarked?: string }>;
}) {
  const promos = await loadPromos();
  const params = await searchParams;
  return (
    <PromoDashboard
      initialPromos={promos}
      initialPlatform="All"
      initialBookmarked={params.bookmarked === "1"}
    />
  );
}

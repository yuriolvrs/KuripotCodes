import { PromoDashboard } from "@/components/promo-dashboard";
import { loadPromos } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function Home() {
  const promos = await loadPromos();
  return <PromoDashboard initialPromos={promos} />;
}

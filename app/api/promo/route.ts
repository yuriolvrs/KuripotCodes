import { NextResponse, type NextRequest } from "next/server";
import { loadPromos, savePromos } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    const { id, working, used } = await request.json();

    if (!id) {
      return NextResponse.json({ ok: false, message: "Missing promo id" }, { status: 400 });
    }

    const promos = await loadPromos();
    const promoIndex = promos.findIndex((p) => p.id === id);

    if (promoIndex === -1) {
      return NextResponse.json({ ok: false, message: "Promo not found" }, { status: 404 });
    }

    const promo = promos[promoIndex];

    if (working === null) {
      delete promo.working;
    } else if (working !== undefined) {
      promo.working = working;
    }
    if (used === null) {
      delete promo.used;
    } else if (used !== undefined) {
      promo.used = used;
    }

    await savePromos(promos);

    return NextResponse.json({ ok: true, promo });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to update promo" },
      { status: 500 }
    );
  }
}

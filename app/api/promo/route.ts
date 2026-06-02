import { NextResponse, type NextRequest } from "next/server";
import { loadPromos, savePromos, upsertPromo } from "@/lib/storage";
import { PLATFORMS, type Platform, type Promo } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, code, platform, description, discountType, discountValue, region, sourceUrl, startDate, endDate } = body ?? {};

    if (!title || !code || !platform || !sourceUrl) {
      return NextResponse.json({ ok: false, message: "Missing required fields (title, code, platform, sourceUrl)" }, { status: 400 });
    }

    if (!PLATFORMS.includes(platform)) {
      return NextResponse.json({ ok: false, message: "Invalid platform" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newPromo: Promo = {
      id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
      title,
      code,
      platform: platform as Platform,
      sourceUrl,
      status: "active",
      firstSeen: now,
      lastSeen: now,
      ...(description ? { description } : {}),
      ...(discountType ? { discountType } : {}),
      ...(discountValue ? { discountValue } : {}),
      ...(region ? { region } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {})
    };

    await upsertPromo(newPromo);

    return NextResponse.json({ ok: true, promo: newPromo });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to create promo" },
      { status: 500 }
    );
  }
}

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

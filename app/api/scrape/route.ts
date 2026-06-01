import { NextResponse } from "next/server";
import { runScrapePipeline } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await runScrapePipeline();

    return NextResponse.json({
      ok: true,
      foundCount: result.found.length,
      savedCount: result.saved.length,
      promos: result.saved,
      failures: result.failures
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Scrape failed"
      },
      { status: 500 }
    );
  }
}

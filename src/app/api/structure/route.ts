import { NextRequest, NextResponse } from "next/server";
import { fetchKlines } from "@/lib/binance";
import { findPivots } from "@/lib/setupDetection";
import { classifyStructure, detectLiquidityPools } from "@/lib/smc";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") || "BTCUSDT";
  const interval = request.nextUrl.searchParams.get("interval") || "1h";

  try {
    const klines = await fetchKlines(symbol, interval, 150);
    const pivots = findPivots(klines);
    const structure = classifyStructure(pivots);
    const liquidity = detectLiquidityPools(pivots);

    return NextResponse.json({ structure, liquidity });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal menganalisis struktur",
      },
      { status: 502 }
    );
  }
}

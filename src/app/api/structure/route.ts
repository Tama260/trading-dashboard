import { NextRequest, NextResponse } from "next/server";
import { fetchKlines } from "@/lib/binance";
import { findPivots } from "@/lib/setupDetection";
import { atr } from "@/lib/indicators";
import {
  classifyStructure,
  detectLiquidityPools,
  detectLiquiditySweeps,
  detectFairValueGaps,
  detectOrderBlocks,
} from "@/lib/smc";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") || "BTCUSDT";
  const interval = request.nextUrl.searchParams.get("interval") || "1h";

  try {
    const klines = await fetchKlines(symbol, interval, 150);
    const pivots = findPivots(klines);
    const structure = classifyStructure(pivots);
    const liquidity = detectLiquidityPools(pivots);
    const sweeps = detectLiquiditySweeps(klines, liquidity);
    const fvg = detectFairValueGaps(klines);
    const atrValue = atr(klines, 14);
    const orderBlocks = detectOrderBlocks(klines, atrValue);

    return NextResponse.json({
      structure,
      liquidity,
      sweeps,
      fvg,
      orderBlocks,
    });
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

import { NextRequest, NextResponse } from "next/server";
import { fetchKlines, Market } from "@/lib/binance";
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
  // BUG LAMA: endpoint ini dulu selalu fetch data Spot walau user lagi
  // lihat Perpetual di watchlist — structure/liquidity/FVG/OB yang
  // digambar di chart jadi tidak sinkron dengan toggle Spot/Perpetual.
  const market = (request.nextUrl.searchParams.get("market") as Market) || "spot";

  try {
    const klines = await fetchKlines(symbol, interval, 150, market);
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

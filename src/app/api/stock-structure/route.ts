import { NextRequest, NextResponse } from "next/server";
import { fetchYahooKlines, StockKline } from "@/lib/idxStocks";
import { fetchStockTimeSeries } from "@/lib/twelveData";
import { Kline } from "@/lib/binance";
import { findPivots } from "@/lib/setupDetection";
import { atr } from "@/lib/indicators";
import {
  classifyStructure,
  detectLiquidityPools,
  detectLiquiditySweeps,
  detectFairValueGaps,
  detectOrderBlocks,
} from "@/lib/smc";

function toEngineKlines(klines: StockKline[]): Kline[] {
  return klines.map((k) => ({
    time: k.time,
    open: k.open,
    high: k.high,
    low: k.low,
    close: k.close,
    volume: k.volume ?? 0,
  }));
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const market = (request.nextUrl.searchParams.get("market") || "us") as
    | "us"
    | "idx"
    | "forex"
    | "gold";

  if (!symbol) {
    return NextResponse.json(
      { error: "Parameter symbol wajib diisi" },
      { status: 400 }
    );
  }

  try {
    const range = market === "idx" ? "3mo" : "6mo";
    let stockKlines: StockKline[];

    try {
      stockKlines = await fetchYahooKlines(symbol, market, range, "1d");
    } catch (yahooError) {
      if (market !== "us") throw yahooError;
      stockKlines = await fetchStockTimeSeries(symbol, "1day", 200);
    }

    const klines = toEngineKlines(stockKlines);
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

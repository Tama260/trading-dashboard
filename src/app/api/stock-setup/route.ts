import { NextRequest, NextResponse } from "next/server";
import { fetchYahooKlines, StockKline } from "@/lib/idxStocks";
import { fetchStockTimeSeries } from "@/lib/twelveData";
import { Kline } from "@/lib/binance";
import { calculateSetup } from "@/lib/setupDetection";

// Reuse persis engine yang sama dengan crypto (/api/setup) — cuma beda
// sumber klines-nya. Bias, entry zone, SL, TP1/TP2 dihitung dengan rumus
// yang sama persis (ATR, pivot, breakout, dst), supaya "Analisis untuk"
// di Saham & Forex punya kualitas dan format yang identik dengan Perpetual
// / Spot di crypto — bukan cuma chart kosong seperti sebelumnya.
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
    let klines: StockKline[];

    try {
      klines = await fetchYahooKlines(symbol, market, range, "1d");
    } catch (yahooError) {
      // Cadangan cuma masuk akal untuk saham AS (Twelve Data tidak
      // punya data forex/emas/IDX di free tier)
      if (market !== "us") throw yahooError;
      klines = await fetchStockTimeSeries(symbol, "1day", 200);
    }

    const setup = calculateSetup(toEngineKlines(klines));
    return NextResponse.json(setup);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal menganalisis setup",
      },
      { status: 502 }
    );
  }
}

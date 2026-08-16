import { NextRequest, NextResponse } from "next/server";
import { fetchKlines, Market } from "@/lib/binance";
import { fetchYahooKlines, StockKline } from "@/lib/idxStocks";
import { fetchStockTimeSeries } from "@/lib/twelveData";
import { Kline } from "@/lib/binance";
import { runBacktest } from "@/lib/backtest";
import { TradingStyle, RISK_PROFILES } from "@/lib/setupDetection";

function parseStyle(raw: string | null): TradingStyle {
  return raw && raw in RISK_PROFILES ? (raw as TradingStyle) : "day";
}

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
  const category = request.nextUrl.searchParams.get("category") || "crypto";
  const interval = request.nextUrl.searchParams.get("interval") || "1h";
  const style = parseStyle(request.nextUrl.searchParams.get("style"));

  if (!symbol) {
    return NextResponse.json({ error: "Parameter symbol wajib diisi" }, { status: 400 });
  }

  try {
    let klines: Kline[];

    if (category === "crypto") {
      const market = (request.nextUrl.searchParams.get("market") as Market) || "spot";
      // Ambil sebanyak mungkin candle (maks yang diizinkan Binance per
      // request) — makin banyak data historis, makin representatif hasil
      // backtest-nya (bukan cuma kebetulan cocok di 1 kondisi pasar)
      klines = await fetchKlines(symbol, interval, 1000, market);
    } else {
      const market = (request.nextUrl.searchParams.get("market") || "us") as
        | "us"
        | "idx"
        | "forex"
        | "gold";
      const range = market === "idx" ? "2y" : "5y";
      let stockKlines: StockKline[];
      try {
        stockKlines = await fetchYahooKlines(symbol, market, range, "1d");
      } catch (yahooError) {
        if (market !== "us") throw yahooError;
        stockKlines = await fetchStockTimeSeries(symbol, "1day", 1000);
      }
      klines = toEngineKlines(stockKlines);
    }

    if (klines.length < 150) {
      return NextResponse.json(
        {
          error: `Data historis cuma ${klines.length} candle — kurang dari minimal 150 buat backtest yang representatif`,
        },
        { status: 422 }
      );
    }

    const result = runBacktest(klines, style);
    return NextResponse.json({ ...result, candleCount: klines.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menjalankan backtest" },
      { status: 502 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { fetchKlines, Market } from "@/lib/binance";
import { calculateSetup, TradingStyle, RISK_PROFILES } from "@/lib/setupDetection";

function parseStyle(raw: string | null): TradingStyle {
  return raw && raw in RISK_PROFILES ? (raw as TradingStyle) : "day";
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") || "BTCUSDT";
  const interval = request.nextUrl.searchParams.get("interval") || "1h";
  const market = (request.nextUrl.searchParams.get("market") as Market) || "spot";
  const style = parseStyle(request.nextUrl.searchParams.get("style"));

  try {
    const klines = await fetchKlines(symbol, interval, 100, market);
    const setup = calculateSetup(klines, style);
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

import { NextRequest, NextResponse } from "next/server";
import { fetchKlines, Market } from "@/lib/binance";
import { calculateSetup } from "@/lib/setupDetection";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") || "BTCUSDT";
  const interval = request.nextUrl.searchParams.get("interval") || "1h";
  const market = (request.nextUrl.searchParams.get("market") as Market) || "spot";

  try {
    const klines = await fetchKlines(symbol, interval, 100, market);
    const setup = calculateSetup(klines);
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

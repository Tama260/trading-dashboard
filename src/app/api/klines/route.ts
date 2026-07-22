import { NextRequest, NextResponse } from "next/server";
import { fetchKlines, Market } from "@/lib/binance";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") || "BTCUSDT";
  const interval = request.nextUrl.searchParams.get("interval") || "1h";
  const limit = Number(request.nextUrl.searchParams.get("limit") || "200");
  const market = (request.nextUrl.searchParams.get("market") as Market) || "spot";

  try {
    const klines = await fetchKlines(symbol, interval, limit, market);
    return NextResponse.json(klines);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengambil klines" },
      { status: 502 }
    );
  }
}

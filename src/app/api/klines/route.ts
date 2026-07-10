import { NextRequest, NextResponse } from "next/server";
import { fetchKlines } from "@/lib/binance";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") || "BTCUSDT";
  const interval = request.nextUrl.searchParams.get("interval") || "1h";
  const limit = Number(request.nextUrl.searchParams.get("limit") || "200");

  try {
    const klines = await fetchKlines(symbol, interval, limit);
    return NextResponse.json(klines);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengambil klines" },
      { status: 502 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { fetchTicker24hr } from "@/lib/binance";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json(
      { error: "Parameter symbol wajib diisi" },
      { status: 400 }
    );
  }

  try {
    const ticker = await fetchTicker24hr(symbol);
    return NextResponse.json({
      price: ticker.price.toFixed(2),
      changePercent: ticker.changePercent.toFixed(2),
      high: ticker.high.toFixed(2),
      low: ticker.low.toFixed(2),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengambil data" },
      { status: 502 }
    );
  }
}

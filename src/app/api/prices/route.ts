import { NextRequest, NextResponse } from "next/server";
import { fetchTicker24hr, Market } from "@/lib/binance";
import { formatPrice } from "@/lib/format";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const market = (request.nextUrl.searchParams.get("market") as Market) || "spot";

  if (!symbol) {
    return NextResponse.json(
      { error: "Parameter symbol wajib diisi" },
      { status: 400 }
    );
  }

  try {
    const ticker = await fetchTicker24hr(symbol, market);
    return NextResponse.json({
      price: formatPrice(ticker.price),
      changePercent: ticker.changePercent.toFixed(2),
      high: formatPrice(ticker.high),
      low: formatPrice(ticker.low),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengambil data" },
      { status: 502 }
    );
  }
}

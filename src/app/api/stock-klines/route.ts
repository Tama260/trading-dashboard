import { NextRequest, NextResponse } from "next/server";
import { fetchStockTimeSeries } from "@/lib/twelveData";
import { fetchIdxStockKlines } from "@/lib/idxStocks";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const market = request.nextUrl.searchParams.get("market") || "us";

  if (!symbol) {
    return NextResponse.json(
      { error: "Parameter symbol wajib diisi" },
      { status: 400 }
    );
  }

  try {
    const klines =
      market === "idx"
        ? await fetchIdxStockKlines(symbol, "3mo", "1d")
        : await fetchStockTimeSeries(symbol, "1day", 200);

    return NextResponse.json(klines);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal mengambil candlestick",
      },
      { status: 502 }
    );
  }
}

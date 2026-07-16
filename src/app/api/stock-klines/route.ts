import { NextRequest, NextResponse } from "next/server";
import { fetchStockTimeSeries } from "@/lib/twelveData";
import { fetchYahooKlines } from "@/lib/idxStocks";

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

  // Sama seperti /api/stocks — Yahoo dicoba duluan (limit lebih longgar),
  // Twelve Data jadi cadangan
  try {
    const range = market === "idx" ? "3mo" : "6mo";
    const klines = await fetchYahooKlines(symbol, market, range, "1d");
    return NextResponse.json(klines);
  } catch (yahooError) {
    try {
      const klines = await fetchStockTimeSeries(symbol, "1day", 200);
      return NextResponse.json(klines);
    } catch (twelveDataError) {
      return NextResponse.json(
        {
          error: `Yahoo: ${
            yahooError instanceof Error ? yahooError.message : "gagal"
          } | Twelve Data: ${
            twelveDataError instanceof Error
              ? twelveDataError.message
              : "gagal"
          }`,
        },
        { status: 502 }
      );
    }
  }
}

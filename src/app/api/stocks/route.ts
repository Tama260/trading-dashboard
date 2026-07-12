import { NextRequest, NextResponse } from "next/server";
import { fetchStockQuote, fetchGoldPrice } from "@/lib/twelveData";
import { fetchIdxStockQuote } from "@/lib/idxStocks";
import { formatPrice } from "@/lib/format";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const market = request.nextUrl.searchParams.get("market") || "us"; // "us" | "idx" | "gold"

  if (market !== "gold" && !symbol) {
    return NextResponse.json(
      { error: "Parameter symbol wajib diisi" },
      { status: 400 }
    );
  }

  try {
    let quote;

    if (market === "gold") {
      quote = await fetchGoldPrice();
    } else if (market === "idx") {
      quote = await fetchIdxStockQuote(symbol!);
    } else {
      quote = await fetchStockQuote(symbol!);
    }

    return NextResponse.json({
      symbol: quote.symbol,
      price: formatPrice(quote.price),
      changePercent: quote.changePercent.toFixed(2),
      high: formatPrice(quote.high),
      low: formatPrice(quote.low),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengambil data" },
      { status: 502 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { fetchStockQuote, fetchGoldPrice } from "@/lib/twelveData";
import { fetchYahooQuote } from "@/lib/idxStocks";
import { fetchFinnhubQuote } from "@/lib/finnhub";
import { formatPrice } from "@/lib/format";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const market = (request.nextUrl.searchParams.get("market") || "us") as
    | "us"
    | "idx"
    | "forex"
    | "gold";

  if (market !== "gold" && !symbol) {
    return NextResponse.json(
      { error: "Parameter symbol wajib diisi" },
      { status: 400 }
    );
  }

  // 3 lapis: Yahoo (gratis, limit longgar) -> Finnhub (kalau ada key,
  // 60/menit, khusus saham AS) -> Twelve Data (paling ketat, tapi paling
  // lengkap cakupannya)
  try {
    const yahooSymbol = market === "gold" ? "XAU/USD" : symbol!;
    const quote = await fetchYahooQuote(yahooSymbol, market);
    return NextResponse.json({
      symbol: quote.symbol,
      price: formatPrice(quote.price),
      changePercent: quote.changePercent.toFixed(2),
      high: formatPrice(quote.high),
      low: formatPrice(quote.low),
    });
  } catch (yahooError) {
    if (market === "us") {
      try {
        const quote = await fetchFinnhubQuote(symbol!);
        return NextResponse.json({
          symbol: quote.symbol,
          price: formatPrice(quote.price),
          changePercent: quote.changePercent.toFixed(2),
          high: formatPrice(quote.high),
          low: formatPrice(quote.low),
        });
      } catch {
        // lanjut ke Twelve Data di bawah
      }
    }

    try {
      const quote =
        market === "gold"
          ? await fetchGoldPrice()
          : await fetchStockQuote(symbol!);
      return NextResponse.json({
        symbol: quote.symbol,
        price: formatPrice(quote.price),
        changePercent: quote.changePercent.toFixed(2),
        high: formatPrice(quote.high),
        low: formatPrice(quote.low),
      });
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

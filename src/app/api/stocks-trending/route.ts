import { NextRequest, NextResponse } from "next/server";
import { fetchStockQuote } from "@/lib/twelveData";
import { fetchYahooQuote } from "@/lib/idxStocks";
import { fetchFinnhubQuote } from "@/lib/finnhub";
import { formatPrice } from "@/lib/format";
import { STOCK_CATEGORIES } from "@/lib/marketCategories";

// 3 lapis fallback: Yahoo (gratis, tanpa key, limit longgar) -> Finnhub
// (butuh key, tapi kalau ada, 60 req/menit) -> Twelve Data (butuh key,
// paling ketat, 8 req/menit)
async function fetchQuoteForMarket(symbol: string, market: "us" | "idx") {
  try {
    return await fetchYahooQuote(symbol, market);
  } catch (yahooError) {
    if (market === "idx") throw yahooError; // IDX cuma ada di Yahoo
    try {
      return await fetchFinnhubQuote(symbol);
    } catch {
      return await fetchStockQuote(symbol);
    }
  }
}

export async function GET(request: NextRequest) {
  const categoryName = request.nextUrl.searchParams.get("category");

  const category = STOCK_CATEGORIES.find((c) => c.name === categoryName);
  if (!category) {
    return NextResponse.json(
      { error: `Kategori "${categoryName}" tidak ditemukan` },
      { status: 400 }
    );
  }

  try {
    const quotes = await Promise.all(
      category.symbols.map(async (symbol) => {
        try {
          const quote = await fetchQuoteForMarket(symbol, category.market);
          return {
            symbol,
            price: formatPrice(quote.price),
            changePercent: quote.changePercent,
          };
        } catch {
          return null;
        }
      })
    );

    const valid = quotes.filter((q): q is NonNullable<typeof q> => q !== null);

    const top3 = valid
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 3)
      .map((q) => ({ ...q, changePercent: q.changePercent.toFixed(2) }));

    return NextResponse.json({
      category: category.name,
      market: category.market,
      movers: top3,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal mengambil data trending",
      },
      { status: 502 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { fetchStockQuote } from "@/lib/twelveData";
import { fetchIdxStockQuote } from "@/lib/idxStocks";
import { formatPrice } from "@/lib/format";
import { STOCK_CATEGORIES } from "@/lib/marketCategories";

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
          const quote =
            category.market === "idx"
              ? await fetchIdxStockQuote(symbol)
              : await fetchStockQuote(symbol);
          return {
            symbol,
            price: formatPrice(quote.price),
            changePercent: quote.changePercent,
          };
        } catch {
          // 1 symbol gagal (misal quota Twelve Data habis) — skip, jangan
          // gagalkan seluruh kategori
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

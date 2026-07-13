import { NextRequest, NextResponse } from "next/server";
import { fetchTicker24hr } from "@/lib/binance";
import { formatPrice } from "@/lib/format";
import { MARKET_CATEGORIES } from "@/lib/marketCategories";

async function computeCategory(category: { name: string; symbols: string[] }) {
  const tickers = await Promise.all(
    category.symbols.map(async (symbol) => {
      try {
        const ticker = await fetchTicker24hr(symbol);
        return {
          symbol,
          price: formatPrice(ticker.price),
          changePercent: ticker.changePercent,
        };
      } catch {
        return null;
      }
    })
  );

  const valid = tickers.filter((t): t is NonNullable<typeof t> => t !== null);

  return valid
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 3)
    .map((t) => ({ ...t, changePercent: t.changePercent.toFixed(2) }));
}

export async function GET(request: NextRequest) {
  const categoryParam = request.nextUrl.searchParams.get("category");

  try {
    if (categoryParam) {
      const category = MARKET_CATEGORIES.find((c) => c.name === categoryParam);
      if (!category) {
        return NextResponse.json(
          { error: `Kategori "${categoryParam}" tidak ditemukan` },
          { status: 400 }
        );
      }
      const movers = await computeCategory(category);
      return NextResponse.json({ category: category.name, movers });
    }

    // Tanpa parameter category, hitung semua (dipakai kalau nanti ada
    // kebutuhan tampilkan sekaligus)
    const results = await Promise.all(
      MARKET_CATEGORIES.map(async (category) => ({
        category: category.name,
        movers: await computeCategory(category),
      }))
    );
    return NextResponse.json({ categories: results });
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

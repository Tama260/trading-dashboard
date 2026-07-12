import { NextResponse } from "next/server";
import { fetchTicker24hr } from "@/lib/binance";
import { formatPrice } from "@/lib/format";
import { MARKET_CATEGORIES } from "@/lib/marketCategories";

export async function GET() {
  try {
    const results = await Promise.all(
      MARKET_CATEGORIES.map(async (category) => {
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
              // Kalau 1 symbol gagal (misal belum listing), skip diam-diam
              // — jangan gagalkan seluruh kategori cuma karena 1 token
              return null;
            }
          })
        );

        const valid = tickers.filter((t): t is NonNullable<typeof t> => t !== null);

        // Urutkan berdasar besaran perubahan 24 jam (naik ATAU turun
        // ekstrem sama-sama dianggap "happening")
        const top3 = valid
          .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
          .slice(0, 3)
          .map((t) => ({
            ...t,
            changePercent: t.changePercent.toFixed(2),
          }));

        return { category: category.name, movers: top3 };
      })
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

import { NextRequest, NextResponse } from "next/server";
import { fetchKlines, Market } from "@/lib/binance";
import { atr, detectRegime, volatilityLevel } from "@/lib/indicators";

type FearGreed = { value: number; label: string };

// Fear & Greed Index: API publik gratis tanpa API key dari alternative.me,
// dipakai luas oleh komunitas crypto sebagai proksi sentimen pasar
// (0 = Extreme Fear, 100 = Extreme Greed).
async function fetchFearGreed(): Promise<FearGreed> {
  const res = await fetch("https://api.alternative.me/fng/?limit=1", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Gagal mengambil Fear & Greed Index");
  const json = await res.json();
  return {
    value: parseInt(json.data[0].value, 10),
    label: json.data[0].value_classification as string,
  };
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") || "BTCUSDT";
  const market = (request.nextUrl.searchParams.get("market") as Market) || "spot";

  try {
    const [klines, sentiment] = await Promise.all([
      fetchKlines(symbol, "1h", 100, market),
      // Sentiment bersifat opsional — kalau gagal, jangan gagalkan
      // seluruh response, cukup kirim null untuk bagian ini saja.
      fetchFearGreed().catch(() => null),
    ]);

    if (klines.length < 25) {
      throw new Error("Data candlestick tidak cukup untuk analisis");
    }

    const { regime, confidence } = detectRegime(klines);
    const atrValue = atr(klines, 14);
    const lastClose = klines[klines.length - 1].close;
    const atrPercent = (atrValue / lastClose) * 100;

    return NextResponse.json({
      regime,
      confidence,
      volatility: {
        level: volatilityLevel(atrPercent),
        atrPercent: atrPercent.toFixed(2),
      },
      sentiment,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Gagal menghitung market intelligence",
      },
      { status: 502 }
    );
  }
}

// PENTING — BACA INI:
// Twelve Data (sumber resmi kita untuk saham AS) MENCANTUMKAN Indonesia
// Stock Exchange di daftar mereka, TAPI itu masuk paket berbayar (bukan
// free tier). Untuk saham IDX gratis, satu-satunya opsi praktis yang saya
// temukan adalah endpoint publik Yahoo Finance — INI TIDAK RESMI/TIDAK
// DIDOKUMENTASIKAN oleh Yahoo, tapi dipakai luas oleh komunitas developer
// (termasuk library populer seperti yfinance) selama bertahun-tahun tanpa
// masalah untuk skala personal/portofolio. Beda dengan TradingView yang
// SECARA EKSPLISIT melarang di lisensinya, Yahoo tidak melarang secara
// eksplisit — tapi tetap "unofficial", bisa berubah sewaktu-waktu tanpa
// pemberitahuan. Cocok untuk portofolio/belajar, TIDAK disarankan untuk
// produk komersial serius.
//
// Format symbol IDX di Yahoo Finance: kode saham + ".JK", contoh:
// BBCA.JK, TLKM.JK, BBRI.JK

export type StockQuote = {
  symbol: string;
  price: number;
  changePercent: number;
  high: number;
  low: number;
};

// Konversi symbol + market ke format ticker Yahoo Finance. Yahoo pakai
// suffix berbeda per jenis aset:
// - Saham AS: symbol apa adanya (AAPL)
// - Saham IDX: symbol + ".JK" (BBCA.JK)
// - Forex: hilangkan slash, tambah "=X" (EUR/USD -> EURUSD=X)
// - Emas: format forex-style "XAUUSD=X"
function toYahooSymbol(
  symbol: string,
  market: "us" | "idx" | "forex" | "gold"
): string {
  const clean = symbol.toUpperCase();
  if (market === "idx") {
    return clean.endsWith(".JK") ? clean : `${clean}.JK`;
  }
  if (market === "gold") {
    return "XAUUSD=X";
  }
  if (market === "forex") {
    return `${clean.replace("/", "")}=X`;
  }
  return clean; // saham AS, apa adanya
}

export async function fetchYahooQuote(
  symbol: string,
  market: "us" | "idx" | "forex" | "gold"
): Promise<StockQuote> {
  const yahooSymbol = toYahooSymbol(symbol, market);

  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
    {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TradingDashboard/1.0)",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Yahoo Finance merespons status ${res.status}`);
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];

  if (!result) {
    throw new Error(`Symbol "${symbol}" tidak ditemukan di Yahoo Finance`);
  }

  const meta = result.meta;
  const price = meta.regularMarketPrice;
  const prevClose = meta.previousClose ?? meta.chartPreviousClose;
  const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

  return {
    symbol: yahooSymbol,
    price,
    changePercent,
    high: meta.regularMarketDayHigh ?? price,
    low: meta.regularMarketDayLow ?? price,
  };
}

export async function fetchYahooKlines(
  symbol: string,
  market: "us" | "idx" | "forex" | "gold",
  range = "3mo",
  interval = "1d"
): Promise<StockKline[]> {
  const yahooSymbol = toYahooSymbol(symbol, market);

  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${range}&interval=${interval}`,
    {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TradingDashboard/1.0)",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Yahoo Finance merespons status ${res.status}`);
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];

  if (!result || !result.timestamp) {
    throw new Error(`Data candlestick "${symbol}" tidak tersedia`);
  }

  const timestamps: number[] = result.timestamp;
  const quote = result.indicators.quote[0];

  const klines: StockKline[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (
      quote.open[i] == null ||
      quote.high[i] == null ||
      quote.low[i] == null ||
      quote.close[i] == null
    ) {
      continue;
    }
    klines.push({
      time: timestamps[i],
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
    });
  }

  return klines;
}

export type StockKline = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

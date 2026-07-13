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

export async function fetchIdxStockQuote(symbol: string): Promise<StockQuote> {
  const cleanSymbol = symbol.toUpperCase().endsWith(".JK")
    ? symbol.toUpperCase()
    : `${symbol.toUpperCase()}.JK`;

  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}`,
    {
      cache: "no-store",
      headers: {
        // Beberapa endpoint Yahoo menolak request tanpa User-Agent yang wajar
        "User-Agent": "Mozilla/5.0 (compatible; TradingDashboard/1.0)",
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `Saham IDX "${symbol}" tidak ditemukan (status ${res.status})`
    );
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];

  if (!result) {
    throw new Error(`Saham IDX "${symbol}" tidak ditemukan`);
  }

  const meta = result.meta;
  const price = meta.regularMarketPrice;
  const prevClose = meta.previousClose ?? meta.chartPreviousClose;
  const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

  return {
    symbol: cleanSymbol,
    price,
    changePercent,
    high: meta.regularMarketDayHigh ?? price,
    low: meta.regularMarketDayLow ?? price,
  };
}

export type StockKline = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

// Yahoo Finance chart endpoint SEBENARNYA sudah mengembalikan data OHLC
// historis lengkap (dipakai untuk render chart di web Yahoo sendiri) — kita
// tinggal ambil bagian "indicators.quote" yang selama ini tidak dipakai
// saat cuma butuh quote sesaat.
export async function fetchIdxStockKlines(
  symbol: string,
  range = "3mo",
  interval = "1d"
): Promise<StockKline[]> {
  const cleanSymbol = symbol.toUpperCase().endsWith(".JK")
    ? symbol.toUpperCase()
    : `${symbol.toUpperCase()}.JK`;

  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?range=${range}&interval=${interval}`,
    {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TradingDashboard/1.0)",
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `Saham IDX "${symbol}" tidak ditemukan (status ${res.status})`
    );
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
    // Yahoo kadang mengembalikan null untuk bar yang bursa-nya tutup —
    // skip bar yang datanya tidak lengkap
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

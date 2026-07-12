// Kumpulan fungsi shared untuk mengambil data dari Binance secara
// server-side (bukan dari browser), dengan fallback 2 endpoint publik.
// Dipakai oleh beberapa API route (prices, klines, market-intel) supaya
// logikanya tidak duplikat di banyak tempat (prinsip DRY).

const BASE_URLS = [
  "https://api.binance.com/api/v3",
  "https://data-api.binance.vision/api/v3",
];

async function fetchWithFallback(path: string): Promise<unknown> {
  let lastStatus = 0;
  for (const base of BASE_URLS) {
    try {
      const res = await fetch(`${base}${path}`, { cache: "no-store" });
      if (res.ok) return await res.json();
      lastStatus = res.status;
    } catch {
      // gagal konek ke base URL ini, lanjut coba yang berikutnya
    }
  }

  if (lastStatus === 400) {
    throw new Error(
      "Symbol tidak ditemukan di Binance — cek lagi penulisannya, atau token ini mungkin belum listing di Binance"
    );
  }

  throw new Error(
    `Semua endpoint Binance gagal (status terakhir: ${lastStatus})`
  );
}

export type Ticker24hr = {
  price: number;
  changePercent: number;
  high: number;
  low: number;
};

// Bitget punya API publik gratis sendiri (tanpa API key), format response
// beda dari Binance. Dipakai sebagai fallback TERAKHIR — kalau semua
// endpoint Binance gagal (misal token belum listing di Binance seperti
// kasus HYPE), coba cari di Bitget dulu sebelum benar-benar menyerah.
async function fetchTicker24hrFromBitget(symbol: string): Promise<Ticker24hr> {
  const res = await fetch(
    `https://api.bitget.com/api/v2/spot/market/tickers?symbol=${symbol.toUpperCase()}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Bitget merespons status ${res.status}`);
  }

  const json = await res.json();
  const raw = json?.data?.[0];

  if (!raw) {
    throw new Error("Symbol tidak ditemukan di Binance maupun Bitget");
  }

  return {
    price: parseFloat(raw.lastPr),
    changePercent: parseFloat(raw.changeUtc24h) * 100,
    high: parseFloat(raw.high24h),
    low: parseFloat(raw.low24h),
  };
}

export async function fetchTicker24hr(symbol: string): Promise<Ticker24hr> {
  try {
    const raw = (await fetchWithFallback(
      `/ticker/24hr?symbol=${symbol.toUpperCase()}`
    )) as {
      lastPrice: string;
      priceChangePercent: string;
      highPrice: string;
      lowPrice: string;
    };
    return {
      price: parseFloat(raw.lastPrice),
      changePercent: parseFloat(raw.priceChangePercent),
      high: parseFloat(raw.highPrice),
      low: parseFloat(raw.lowPrice),
    };
  } catch (binanceError) {
    // Semua endpoint Binance gagal — coba Bitget sebelum menyerah total
    try {
      return await fetchTicker24hrFromBitget(symbol);
    } catch {
      // Bitget juga gagal — lempar error asli dari Binance, itu lebih
      // informatif (pesan "symbol tidak ditemukan" dari fetchWithFallback)
      throw binanceError;
    }
  }
}

export type Kline = {
  time: number; // unix seconds — format yang dibutuhkan lightweight-charts
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export async function fetchKlines(
  symbol: string,
  interval = "1h",
  limit = 200
): Promise<Kline[]> {
  const raw = (await fetchWithFallback(
    `/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`
  )) as unknown[][];

  return raw.map((k) => ({
    time: Math.floor((k[0] as number) / 1000),
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
  }));
}

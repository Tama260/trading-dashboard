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

export async function fetchTicker24hr(symbol: string): Promise<Ticker24hr> {
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

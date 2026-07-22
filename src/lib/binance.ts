// Kumpulan fungsi shared untuk mengambil data dari Binance secara
// server-side (bukan dari browser), dengan fallback 2 endpoint publik.
// Dipakai oleh beberapa API route (prices, klines, market-intel) supaya
// logikanya tidak duplikat di banyak tempat (prinsip DRY).
//
// Mendukung 2 jenis market: "spot" (default) dan "futures" (perpetual
// USDT-M). Field response Binance Futures kebetulan SAMA PERSIS namanya
// dengan Spot (lastPrice, priceChangePercent, dst), jadi logic parsing-nya
// bisa dipakai ulang — cuma base URL-nya yang beda.

export type Market = "spot" | "futures";

const SPOT_BASE_URLS = [
  "https://api.binance.com/api/v3",
  "https://data-api.binance.vision/api/v3",
];

const FUTURES_BASE_URLS = ["https://fapi.binance.com/fapi/v1"];

function getBaseUrls(market: Market): string[] {
  return market === "futures" ? FUTURES_BASE_URLS : SPOT_BASE_URLS;
}

async function fetchWithFallback(
  baseUrls: string[],
  path: string
): Promise<unknown> {
  let lastStatus = 0;
  for (const base of baseUrls) {
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

// Bitget punya API publik gratis sendiri (tanpa API key), untuk spot MAUPUN
// futures (mix). Dipakai sebagai fallback TERAKHIR — kalau semua endpoint
// Binance gagal (misal token belum listing di Binance seperti kasus HYPE).
async function fetchTicker24hrFromBitget(
  symbol: string,
  market: Market
): Promise<Ticker24hr> {
  const url =
    market === "futures"
      ? `https://api.bitget.com/api/v2/mix/market/ticker?symbol=${symbol.toUpperCase()}&productType=USDT-FUTURES`
      : `https://api.bitget.com/api/v2/spot/market/tickers?symbol=${symbol.toUpperCase()}`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Bitget merespons status ${res.status}`);
  }

  const json = await res.json();
  const raw = json?.data?.[0];

  if (!raw) {
    throw new Error("Symbol tidak ditemukan di Binance maupun Bitget");
  }

  // Nama field spot ("changeUtc24h") dan mix/futures ("change24h") sedikit
  // beda di Bitget, jadi kita coba dua-duanya
  const changeRaw = raw.change24h ?? raw.changeUtc24h;

  return {
    price: parseFloat(raw.lastPr),
    changePercent: parseFloat(changeRaw) * 100,
    high: parseFloat(raw.high24h),
    low: parseFloat(raw.low24h),
  };
}

export async function fetchTicker24hr(
  symbol: string,
  market: Market = "spot"
): Promise<Ticker24hr> {
  try {
    const raw = (await fetchWithFallback(
      getBaseUrls(market),
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
      return await fetchTicker24hrFromBitget(symbol, market);
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

const GRANULARITY_MAP: Record<string, string> = {
  "1m": "1min",
  "5m": "5min",
  "15m": "15min",
  "30m": "30min",
  "1h": "1h",
  "4h": "4h",
  "1d": "1day",
};

// Ambil candlestick dari Bitget sebagai fallback — dipakai kalau token
// tidak ada di Binance (misal HYPE). Format response Bitget beda dari
// Binance, dan urutan datanya perlu dibalik (Bitget kembalikan terbaru
// duluan, kita butuh kronologis lama->baru).
async function fetchKlinesFromBitget(
  symbol: string,
  interval: string,
  limit: number,
  market: Market
): Promise<Kline[]> {
  const granularity = GRANULARITY_MAP[interval] || "1h";

  const url =
    market === "futures"
      ? `https://api.bitget.com/api/v2/mix/market/candles?symbol=${symbol.toUpperCase()}&granularity=${granularity}&productType=USDT-FUTURES&limit=${limit}`
      : `https://api.bitget.com/api/v2/spot/market/candles?symbol=${symbol.toUpperCase()}&granularity=${granularity}&limit=${limit}`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Bitget merespons status ${res.status}`);
  }

  const json = await res.json();
  const raw = json?.data as string[][] | undefined;

  if (!raw || raw.length === 0) {
    throw new Error("Data candlestick tidak ditemukan di Bitget");
  }

  return raw
    .map((k) => ({
      time: Math.floor(parseInt(k[0], 10) / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }))
    .reverse();
}

export async function fetchKlines(
  symbol: string,
  interval = "1h",
  limit = 200,
  market: Market = "spot"
): Promise<Kline[]> {
  try {
    const raw = (await fetchWithFallback(
      getBaseUrls(market),
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
  } catch (binanceError) {
    try {
      return await fetchKlinesFromBitget(symbol, interval, limit, market);
    } catch {
      throw binanceError;
    }
  }
}

// Twelve Data: sumber resmi & legal untuk saham AS dan emas/komoditas.
// Free tier: 800 request/hari — cukup untuk dashboard skala personal.
//
// WAJIB daftar akun gratis di https://twelvedata.com dan ambil API key-nya,
// lalu set sebagai environment variable TWELVE_DATA_API_KEY (di .env.local
// untuk lokal, dan di Vercel Project Settings > Environment Variables untuk
// production).
const TWELVE_DATA_BASE = "https://api.twelvedata.com";

export type StockQuote = {
  symbol: string;
  price: number;
  changePercent: number;
  high: number;
  low: number;
};

export async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TWELVE_DATA_API_KEY belum diset di environment variable"
    );
  }

  const res = await fetch(
    `${TWELVE_DATA_BASE}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Twelve Data merespons status ${res.status}`);
  }

  const raw = await res.json();

  if (raw.status === "error" || raw.code) {
    throw new Error(raw.message || "Symbol tidak ditemukan di Twelve Data");
  }

  return {
    symbol: raw.symbol,
    price: parseFloat(raw.close),
    changePercent: parseFloat(raw.percent_change),
    high: parseFloat(raw.high),
    low: parseFloat(raw.low),
  };
}

// Emas: Twelve Data pakai format symbol "XAU/USD" untuk komoditas logam mulia
export async function fetchGoldPrice(): Promise<StockQuote> {
  return fetchStockQuote("XAU/USD");
}

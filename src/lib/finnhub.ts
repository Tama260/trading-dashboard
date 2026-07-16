// Finnhub: sumber utama BARU untuk saham AS. Free tier: 60 request/menit
// (Twelve Data cuma 8/menit) — jauh lebih tahan buat dashboard yang polling
// otomatis. Daftar gratis di https://finnhub.io, lalu set FINNHUB_API_KEY
// di environment variable.
const FINNHUB_BASE = "https://finnhub.io/api/v1";

export type StockQuote = {
  symbol: string;
  price: number;
  changePercent: number;
  high: number;
  low: number;
};

export async function fetchFinnhubQuote(symbol: string): Promise<StockQuote> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY belum diset di environment variable");
  }

  const res = await fetch(
    `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Finnhub merespons status ${res.status}`);
  }

  const raw = await res.json();

  // Finnhub mengembalikan semua field 0 kalau symbol tidak dikenali —
  // tidak ada error eksplisit, jadi kita deteksi manual
  if (raw.c === 0 && raw.h === 0 && raw.l === 0) {
    throw new Error(`Symbol "${symbol}" tidak ditemukan di Finnhub`);
  }

  const price = raw.c; // current price
  const prevClose = raw.pc; // previous close
  const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

  return {
    symbol,
    price,
    changePercent,
    high: raw.h,
    low: raw.l,
  };
}

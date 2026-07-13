// Binance tidak menyediakan data "kategori" lewat API publik gratis, jadi
// ini daftar kurasi manual — token populer per kategori. Kalau nanti mau
// ditambah/dikurangi, tinggal edit array di sini.
export const MARKET_CATEGORIES: { name: string; symbols: string[] }[] = [
  {
    name: "Layer 1",
    symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "AVAXUSDT", "ADAUSDT"],
  },
  {
    name: "Layer 2",
    symbols: ["ARBUSDT", "OPUSDT", "MATICUSDT", "STRKUSDT"],
  },
  {
    name: "DeFi",
    symbols: ["UNIUSDT", "AAVEUSDT", "LINKUSDT", "MKRUSDT", "CRVUSDT"],
  },
  {
    name: "Meme Coin",
    symbols: ["DOGEUSDT", "SHIBUSDT", "PEPEUSDT", "FLOKIUSDT", "BONKUSDT"],
  },
  {
    name: "GameFi & Metaverse",
    symbols: ["SANDUSDT", "MANAUSDT", "AXSUSDT", "GALAUSDT"],
  },
  {
    name: "AI & DePIN",
    symbols: ["FETUSDT", "RENDERUSDT", "TAOUSDT", "GRTUSDT"],
  },
];

// Kurasi manual saham populer per kategori. Daftar sengaja DIBATASI JUMLAHNYA
// (5-6 per kategori) — khusus "Saham Luar" pakai Twelve Data yang jatah
// gratisnya cuma 800 request/hari, jadi tidak boleh terlalu banyak symbol
// dicek sekaligus.
export const STOCK_CATEGORIES: {
  name: string;
  market: "us" | "idx";
  symbols: string[];
}[] = [
  {
    name: "Saham Luar (US)",
    market: "us",
    symbols: ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN"],
  },
  {
    name: "Saham Indo (IDX)",
    market: "idx",
    // IDX pakai Yahoo Finance (tidak ada limit ketat seperti Twelve Data),
    // jadi daftar boleh sedikit lebih banyak
    symbols: ["BBCA", "BBRI", "TLKM", "ASII", "GOTO", "BMRI"],
  },
];

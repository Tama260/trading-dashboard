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

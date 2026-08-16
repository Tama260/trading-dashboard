export type WatchlistCategory = "crypto" | "saham" | "forex" | "emas";

export type WatchlistEntry = {
  symbol: string;
  label: string;
  category: WatchlistCategory;
  market: string; // "spot" (crypto) | "us" | "idx" | "forex" | "gold"
};

// SATU sumber kebenaran buat baca watchlist user dari localStorage — key &
// default HARUS identik dengan yang dipakai Watchlist.tsx /
// StockWatchlist.tsx / ForexWatchlist.tsx. Dipakai oleh MarketScanner dan
// CommandPalette supaya keduanya selalu menampilkan watchlist yang sama
// persis, tanpa duplikasi logic baca localStorage di 2 tempat.
export function loadAllWatchlistEntries(): WatchlistEntry[] {
  if (typeof window === "undefined") return [];

  const entries: WatchlistEntry[] = [];

  try {
    const raw = localStorage.getItem("trading-dashboard-watchlist");
    const symbols: string[] = raw
      ? JSON.parse(raw)
      : ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT"];
    for (const s of symbols) {
      entries.push({ symbol: s, label: s.replace("USDT", ""), category: "crypto", market: "spot" });
    }
  } catch {
    // localStorage gagal dibaca — skip crypto, jangan sampai gagal total
  }

  try {
    const raw = localStorage.getItem("trading-dashboard-stocks-watchlist");
    const items: { symbol: string; market: "us" | "idx" | "gold"; label: string }[] = raw
      ? JSON.parse(raw)
      : [
          { symbol: "AAPL", market: "us", label: "AAPL" },
          { symbol: "TLKM", market: "idx", label: "TLKM" },
          { symbol: "XAUUSD", market: "gold", label: "Emas" },
        ];
    for (const it of items) {
      entries.push({
        symbol: it.symbol,
        label: it.label,
        category: it.market === "gold" ? "emas" : "saham",
        market: it.market,
      });
    }
  } catch {
    // skip
  }

  try {
    const raw = localStorage.getItem("trading-dashboard-forex-watchlist");
    const items: { symbol: string; market: "forex"; label: string }[] = raw
      ? JSON.parse(raw)
      : [
          { symbol: "EUR/USD", market: "forex", label: "EUR/USD" },
          { symbol: "USD/IDR", market: "forex", label: "USD/IDR" },
          { symbol: "GBP/USD", market: "forex", label: "GBP/USD" },
        ];
    for (const it of items) {
      entries.push({ symbol: it.symbol, label: it.label, category: "forex", market: "forex" });
    }
  } catch {
    // skip
  }

  return entries;
}

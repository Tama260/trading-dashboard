"use client";

import { useState } from "react";
import MarketIntel from "./MarketIntel";
import TradeSetupPanel from "./TradeSetupPanel";

export default function AnalysisSection({
  availableSymbols,
}: {
  availableSymbols: string[];
}) {
  const [symbol, setSymbol] = useState(availableSymbols[0] ?? "BTCUSDT");

  // Kalau symbol yang sedang dipilih sudah tidak ada di watchlist (baru
  // dihapus), pakai symbol pertama yang masih ada. Dihitung langsung saat
  // render (bukan lewat effect+setState) — lebih efisien, tidak perlu
  // extra render cycle.
  const effectiveSymbol = availableSymbols.includes(symbol)
    ? symbol
    : availableSymbols[0] ?? "BTCUSDT";

  if (availableSymbols.length === 0) {
    return (
      <div className="text-sm text-neutral-500 mb-6">
        Tambahkan minimal 1 koin ke watchlist untuk mulai analisis.
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs text-neutral-500 uppercase tracking-wide">
          Analisis untuk:
        </label>
        <select
          value={effectiveSymbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-white"
        >
          {availableSymbols.map((s) => (
            <option key={s} value={s}>
              {s.replace("USDT", "")} / USDT
            </option>
          ))}
        </select>
      </div>

      <section className="mb-6">
        <MarketIntel symbol={effectiveSymbol} />
      </section>

      <section className="mb-6">
        <TradeSetupPanel symbol={effectiveSymbol} interval="1h" />
      </section>
    </>
  );
}

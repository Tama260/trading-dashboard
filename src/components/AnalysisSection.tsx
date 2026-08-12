"use client";

import { useState } from "react";
import MarketIntel from "./MarketIntel";
import TradeSetupPanel from "./TradeSetupPanel";

const TIMEFRAMES = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
  { value: "4h", label: "4h" },
  { value: "1d", label: "1d" },
  { value: "1w", label: "1w" },
] as const;

type TradingStyle = "scalping" | "day" | "swing" | "position";

// Klik salah satu gaya ini otomatis set timeframe default yang cocok —
// tapi user tetap bebas override timeframe secara manual sesudahnya lewat
// tombol timeframe, tanpa itu mengubah pilihan gaya (jadi kombinasinya
// fleksibel, gak dipaksa satu-satu).
const TRADING_STYLES: { value: TradingStyle; label: string; defaultInterval: string }[] = [
  { value: "scalping", label: "Scalping", defaultInterval: "5m" },
  { value: "day", label: "Day Trading", defaultInterval: "1h" },
  { value: "swing", label: "Swing Trading", defaultInterval: "4h" },
  { value: "position", label: "Position Trading", defaultInterval: "1d" },
];

export default function AnalysisSection({
  availableSymbols,
  marketType,
}: {
  availableSymbols: string[];
  // "spot" | "futures" — datang dari toggle Spot/Perpetual di Watchlist.
  // BUG LAMA: dulu tidak diteruskan sama sekali ke TradeSetupPanel, jadi
  // panel "Analisis untuk" SELALU pakai data Spot walau toggle-nya di
  // Perpetual. Sekarang diteruskan supaya keduanya sinkron.
  marketType: "spot" | "futures";
}) {
  const [symbol, setSymbol] = useState(availableSymbols[0] ?? "BTCUSDT");
  // Default "day" + 15m — dipertahankan biar konsisten sama default lama
  // (sebelum ada Trading Style, timeframe defaultnya 15m)
  const [tradingStyle, setTradingStyle] = useState<TradingStyle>("day");
  const [interval, setInterval] = useState<string>("15m");

  function selectStyle(style: TradingStyle) {
    setTradingStyle(style);
    const preset = TRADING_STYLES.find((s) => s.value === style);
    if (preset) setInterval(preset.defaultInterval);
  }

  // Kalau symbol yang sedang dipilih sudah tidak ada di watchlist (baru
  // dihapus), pakai symbol pertama yang masih ada. Dihitung langsung saat
  // render (bukan lewat effect+setState) — lebih efisien, tidak perlu
  // extra render cycle.
  const effectiveSymbol = availableSymbols.includes(symbol)
    ? symbol
    : availableSymbols[0] ?? "BTCUSDT";

  if (availableSymbols.length === 0) {
    return (
      <div className="text-sm text-[var(--text-muted)] mb-6">
        Tambahkan minimal 1 koin ke watchlist untuk mulai analisis.
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
          Gaya Trading:
        </label>
        <div className="flex rounded-md overflow-hidden border border-[var(--border-card-strong)]">
          {TRADING_STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => selectStyle(s.value)}
              title={`Timeframe default: ${s.defaultInterval}`}
              className={`px-3 py-1.5 text-sm ${
                tradingStyle === s.value
                  ? "bg-[var(--badge-sky-bg)] text-[var(--badge-sky-text)]"
                  : "bg-[var(--bg-card)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
          Analisis untuk:
        </label>
        <select
          value={effectiveSymbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)]"
        >
          {availableSymbols.map((s) => (
            <option key={s} value={s}>
              {s.replace("USDT", "")} / USDT
            </option>
          ))}
        </select>

        <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide ml-2">
          Timeframe:
        </label>
        <div className="flex rounded-md overflow-hidden border border-[var(--border-card-strong)]">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setInterval(tf.value)}
              className={`px-3 py-1.5 text-sm ${
                interval === tf.value
                  ? "bg-[var(--badge-sky-bg)] text-[var(--badge-sky-text)]"
                  : "bg-[var(--bg-card)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <section className="mb-6">
        <MarketIntel symbol={effectiveSymbol} />
      </section>

      <section className="mb-6">
        <TradeSetupPanel
          symbol={effectiveSymbol}
          interval={interval}
          category="crypto"
          market={marketType}
          marketLabel={marketType === "futures" ? "Perpetual" : "Spot"}
          tradingStyle={tradingStyle}
        />
      </section>
    </>
  );
}

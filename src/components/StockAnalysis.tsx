"use client";

import { useState } from "react";
import DrawableChart from "./DrawableChart";

type StockItem = {
  symbol: string;
  market: "us" | "idx" | "gold" | "forex";
  label: string;
};

const MARKET_LABEL: Record<string, string> = {
  us: "US",
  idx: "IDX",
  forex: "FX",
};

export default function StockAnalysis({ items }: { items: StockItem[] }) {
  // Chart cuma masuk akal untuk saham (US/IDX), emas dilewati karena
  // Twelve Data time_series untuk komoditas butuh pola query sedikit beda
  // — disederhanakan dulu, bisa ditambah nanti kalau perlu
  const chartable = items.filter((i) => i.market !== "gold");

  const [selectedKey, setSelectedKey] = useState(
    chartable[0] ? `${chartable[0].symbol}|${chartable[0].market}` : ""
  );

  const effectiveKey =
    chartable.some((i) => `${i.symbol}|${i.market}` === selectedKey)
      ? selectedKey
      : chartable[0]
      ? `${chartable[0].symbol}|${chartable[0].market}`
      : "";

  const selected = chartable.find(
    (i) => `${i.symbol}|${i.market}` === effectiveKey
  );

  if (chartable.length === 0) {
    return (
      <div className="text-sm text-neutral-500 mb-6">
        Tambahkan minimal 1 saham (AS/IDX) atau pasangan forex untuk melihat
        chart.
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs text-neutral-500 uppercase tracking-wide">
          Chart untuk:
        </label>
        <select
          value={effectiveKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-white"
        >
          {chartable.map((i) => (
            <option key={`${i.symbol}|${i.market}`} value={`${i.symbol}|${i.market}`}>
              {i.label} ({MARKET_LABEL[i.market] ?? i.market})
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <DrawableChart
          symbol={selected.symbol}
          interval="1d"
          klinesUrl="/api/stock-klines"
          market={selected.market}
        />
      )}

      <p className="text-[11px] text-neutral-600 mt-3">
        Chart saham pakai data harian (1D) — belum ada Setup Detection/SMC
        engine seperti di crypto, fitur gambar manual tetap bisa dipakai.
      </p>
    </div>
  );
}

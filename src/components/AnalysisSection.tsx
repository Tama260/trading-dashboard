"use client";

import { useState } from "react";
import MarketIntel from "./MarketIntel";
import TradeSetupPanel from "./TradeSetupPanel";

const AVAILABLE_SYMBOLS = [
  { value: "BTCUSDT", label: "BTC / USDT" },
  { value: "ETHUSDT", label: "ETH / USDT" },
  { value: "SOLUSDT", label: "SOL / USDT" },
  { value: "BNBUSDT", label: "BNB / USDT" },
  { value: "XRPUSDT", label: "XRP / USDT" },
];

export default function AnalysisSection() {
  const [symbol, setSymbol] = useState("BTCUSDT");

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs text-neutral-500 uppercase tracking-wide">
          Analisis untuk:
        </label>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-white"
        >
          {AVAILABLE_SYMBOLS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <section className="mb-6">
        <MarketIntel symbol={symbol} />
      </section>

      <section className="mb-6">
        <TradeSetupPanel symbol={symbol} interval="1h" />
      </section>
    </>
  );
}

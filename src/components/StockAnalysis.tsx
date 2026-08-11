"use client";

import { useState } from "react";
import TradeSetupPanel from "./TradeSetupPanel";
import { AssetCategory } from "@/lib/analysisContext";

type StockItem = {
  symbol: string;
  market: "us" | "idx" | "gold" | "forex";
  label: string;
};

const MARKET_LABEL: Record<string, string> = {
  us: "Saham AS",
  idx: "Saham IDX",
  forex: "Forex",
  gold: "Emas",
};

// Kategori context AI per jenis market — saham AS & IDX sama-sama masuk
// "saham", forex & emas dipisah karena keduanya dihitung lewat pair-style
// Yahoo (XXX=X) dan sering dianalisis bareng-bareng dalam satu sesi.
function categoryFor(market: StockItem["market"]): AssetCategory {
  if (market === "us" || market === "idx") return "saham";
  if (market === "gold") return "emas";
  return "forex";
}

export default function StockAnalysis({ items }: { items: StockItem[] }) {
  const [selectedKey, setSelectedKey] = useState(
    items[0] ? `${items[0].symbol}|${items[0].market}` : ""
  );

  const effectiveKey =
    items.some((i) => `${i.symbol}|${i.market}` === selectedKey)
      ? selectedKey
      : items[0]
      ? `${items[0].symbol}|${items[0].market}`
      : "";

  const selected = items.find((i) => `${i.symbol}|${i.market}` === effectiveKey);

  if (items.length === 0) {
    return (
      <div className="text-sm text-[var(--text-muted)] mb-6">
        Tambahkan minimal 1 saham (AS/IDX), pasangan forex, atau emas untuk
        mulai analisis.
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
          Analisis untuk:
        </label>
        <select
          value={effectiveKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)]"
        >
          {items.map((i) => (
            <option key={`${i.symbol}|${i.market}`} value={`${i.symbol}|${i.market}`}>
              {i.label} ({MARKET_LABEL[i.market] ?? i.market})
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <TradeSetupPanel
          symbol={selected.symbol}
          interval="1d"
          category={categoryFor(selected.market)}
          market={selected.market}
          marketLabel={MARKET_LABEL[selected.market] ?? selected.market}
        />
      )}

      <p className="text-[11px] text-[var(--text-faint)] mt-3">
        Setup Detection &amp; SMC engine sekarang sama persis dengan crypto (ATR,
        pivot, breakout, entry/SL/TP1/TP2) — cuma sumber datanya beda (Yahoo
        Finance / Twelve Data, harian). Untuk forex &amp; emas, kriteria
        &quot;volume meningkat&quot; dilewati (netral) karena sumber datanya
        tidak menyediakan volume yang reliable.
      </p>
    </div>
  );
}

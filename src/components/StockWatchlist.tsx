"use client";

import { useEffect, useState } from "react";
import StockPriceCard from "./StockPriceCard";
import StockTrendingByCategory from "./StockTrendingByCategory";
import StockAnalysis from "./StockAnalysis";

type StockItem = {
  symbol: string;
  market: "us" | "idx" | "gold";
  label: string;
};

const STORAGE_KEY = "trading-dashboard-stocks-watchlist";

const DEFAULT_ITEMS: StockItem[] = [
  { symbol: "AAPL", market: "us", label: "AAPL" },
  { symbol: "TLKM", market: "idx", label: "TLKM" },
  { symbol: "", market: "gold", label: "Emas (XAU/USD)" },
];

function loadItems(): StockItem[] {
  if (typeof window === "undefined") return DEFAULT_ITEMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ITEMS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_ITEMS;
  } catch {
    return DEFAULT_ITEMS;
  }
}

function saveItems(items: StockItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage penuh/diblokir — tidak fatal
  }
}

export default function StockWatchlist() {
  const [items, setItems] = useState<StockItem[]>(DEFAULT_ITEMS);
  const [hydrated, setHydrated] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newMarket, setNewMarket] = useState<"us" | "idx">("us");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setItems(loadItems());
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    const clean = newSymbol.trim().toUpperCase();
    if (!clean) return;

    const updated = [...items, { symbol: clean, market: newMarket, label: clean }];
    setItems(updated);
    saveItems(updated);
    setNewSymbol("");
    setShowAddForm(false);
  }

  function addItemDirect(symbol: string, market: "us" | "idx") {
    if (items.some((i) => i.symbol === symbol && i.market === market)) return;
    const updated = [...items, { symbol, market, label: symbol }];
    setItems(updated);
    saveItems(updated);
  }

  function removeItem(index: number) {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    saveItems(updated);
  }

  if (!hydrated) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {DEFAULT_ITEMS.map((s, i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 h-[110px] animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs text-neutral-500 uppercase tracking-wide">
            Saham & Emas
          </span>
          <p className="text-[11px] text-neutral-600 mt-0.5">
            Butuh API key gratis dari twelvedata.com untuk saham AS & emas —
            lihat catatan di bawah
          </p>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-md bg-sky-900 text-sky-300 hover:bg-sky-800 transition-colors"
        >
          {showAddForm ? "Batal" : "+ Tambah Saham"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={addItem}
          className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg bg-neutral-800/50"
        >
          <input
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            placeholder="Contoh: TSLA atau BBCA"
            className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-sm text-white"
          />
          <select
            value={newMarket}
            onChange={(e) => setNewMarket(e.target.value as "us" | "idx")}
            className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-sm text-white"
          >
            <option value="us">Saham AS</option>
            <option value="idx">Saham IDX</option>
          </select>
          <button
            type="submit"
            className="text-xs px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-500 transition-colors"
          >
            Tambah
          </button>
        </form>
      )}

      <StockTrendingByCategory onAddToWatchlist={addItemDirect} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <StockPriceCard
            key={`${item.symbol}-${item.market}-${i}`}
            symbol={item.symbol}
            market={item.market}
            label={item.label}
            onRemove={() => removeItem(i)}
          />
        ))}
      </div>

      <p className="text-[11px] text-neutral-600 mt-3 mb-6">
        Saham IDX pakai sumber data tidak resmi (Yahoo Finance) — bisa
        sewaktu-waktu berubah tanpa pemberitahuan. Saham AS & Emas pakai
        Twelve Data (resmi, gratis, butuh API key sendiri).
      </p>

      <StockAnalysis items={items} />
    </div>
  );
}

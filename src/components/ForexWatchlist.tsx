"use client";

import { useEffect, useState } from "react";
import StockPriceCard from "./StockPriceCard";
import StockAnalysis from "./StockAnalysis";

type ForexItem = {
  symbol: string;
  market: "forex";
  label: string;
};

const STORAGE_KEY = "trading-dashboard-forex-watchlist";

const DEFAULT_ITEMS: ForexItem[] = [
  { symbol: "EUR/USD", market: "forex", label: "EUR/USD" },
  { symbol: "USD/IDR", market: "forex", label: "USD/IDR" },
  { symbol: "GBP/USD", market: "forex", label: "GBP/USD" },
];

function loadItems(): ForexItem[] {
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

function saveItems(items: ForexItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage penuh/diblokir — tidak fatal
  }
}

export default function ForexWatchlist() {
  const [items, setItems] = useState<ForexItem[]>(DEFAULT_ITEMS);
  const [hydrated, setHydrated] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setItems(loadItems());
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    let clean = newSymbol.trim().toUpperCase();
    if (!clean) return;

    // "USDIDR" (6 huruf tanpa slash) -> "USD/IDR"
    if (!clean.includes("/") && clean.length === 6) {
      clean = `${clean.slice(0, 3)}/${clean.slice(3)}`;
    }
    if (items.some((i) => i.symbol === clean)) return;

    const updated = [...items, { symbol: clean, market: "forex" as const, label: clean }];
    setItems(updated);
    saveItems(updated);
    setNewSymbol("");
    setShowAddForm(false);
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
            className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5 h-[110px] animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
            Forex
          </span>
          <p className="text-[11px] text-[var(--text-faint)] mt-1">
            Pasangan mata uang — sumber Yahoo Finance (utama) → Twelve Data
            (cadangan, butuh API key)
          </p>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-md bg-[var(--badge-sky-bg)] text-[var(--badge-sky-text)] hover:bg-sky-800 transition-colors"
        >
          {showAddForm ? "Batal" : "+ Tambah Pasangan"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={addItem}
          className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg bg-[var(--bg-card-secondary)]/50"
        >
          <input
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            placeholder="Contoh: USDIDR atau GBP/USD"
            className="bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)]"
          />
          <button
            type="submit"
            className="text-xs px-4 py-2 rounded-md bg-sky-600 text-[var(--text-primary)] hover:bg-sky-500 transition-colors"
          >
            Tambah
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <StockPriceCard
            key={`${item.symbol}-${i}`}
            symbol={item.symbol}
            market="forex"
            label={item.label}
            onRemove={() => removeItem(i)}
          />
        ))}

        {items.length === 0 && (
          <div className="col-span-full text-sm text-[var(--text-muted)] text-center py-6 border border-dashed border-[var(--border-card)] rounded-xl">
            Watchlist forex kosong. Klik &quot;+ Tambah Pasangan&quot; untuk mulai.
          </div>
        )}
      </div>

      <StockAnalysis items={items} />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import StockPriceCard from "./StockPriceCard";
import StockAnalysis from "./StockAnalysis";
import { STOCK_CATEGORIES } from "@/lib/marketCategories";

type StockItem = {
  symbol: string;
  market: "us" | "idx" | "gold" | "forex";
  label: string;
};

const STORAGE_KEY = "trading-dashboard-stocks-watchlist";

const DEFAULT_ITEMS: StockItem[] = [
  { symbol: "AAPL", market: "us", label: "AAPL" },
  { symbol: "TLKM", market: "idx", label: "TLKM" },
  { symbol: "", market: "gold", label: "Emas (XAU/USD)" },
  { symbol: "EUR/USD", market: "forex", label: "EUR/USD" },
  { symbol: "USD/IDR", market: "forex", label: "USD/IDR" },
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

const MY_WATCHLIST_VALUE = "__my_watchlist__";

export default function StockWatchlist() {
  const [items, setItems] = useState<StockItem[]>(DEFAULT_ITEMS);
  const [hydrated, setHydrated] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newMarket, setNewMarket] = useState<"us" | "idx" | "forex">("us");

  // Sama seperti crypto: dropdown "Watchlist Saya" ATAU salah satu kategori
  // trending. Ini yang menentukan apa yang ditampilkan di grid utama DAN
  // di dropdown chart di bawahnya.
  const [viewMode, setViewMode] = useState(MY_WATCHLIST_VALUE);
  const [trendingItems, setTrendingItems] = useState<StockItem[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setItems(loadItems());
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (viewMode === MY_WATCHLIST_VALUE) return;

    let cancelled = false;
    setTrendingLoading(true);
    setTrendingError("");

    const category = STOCK_CATEGORIES.find((c) => c.name === viewMode);

    fetch(`/api/stocks-trending?category=${encodeURIComponent(viewMode)}`, {
      cache: "no-store",
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (cancelled) return;
        if (!ok) throw new Error(json.error || "Gagal memuat trending");
        const market = (json.market as "us" | "idx") ?? category?.market ?? "us";
        setTrendingItems(
          (json.movers as { symbol: string }[]).map((m) => ({
            symbol: m.symbol,
            market,
            label: m.symbol,
          }))
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setTrendingError(
            err instanceof Error ? err.message : "Terjadi kesalahan"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setTrendingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [viewMode]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    let clean = newSymbol.trim().toUpperCase();
    if (!clean) return;

    if (newMarket === "forex" && !clean.includes("/") && clean.length === 6) {
      clean = `${clean.slice(0, 3)}/${clean.slice(3)}`;
    }

    const updated = [...items, { symbol: clean, market: newMarket, label: clean }];
    setItems(updated);
    saveItems(updated);
    setNewSymbol("");
    setShowAddForm(false);
  }

  function addItemDirect(symbol: string, market: "us" | "idx" | "forex" | "gold") {
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
            className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5 h-[110px] animate-pulse"
          />
        ))}
      </div>
    );
  }

  const isMyWatchlist = viewMode === MY_WATCHLIST_VALUE;
  const displayedItems = isMyWatchlist ? items : trendingItems;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
              Saham, Emas & Forex
            </span>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)]"
            >
              <option value={MY_WATCHLIST_VALUE}>Watchlist Saya</option>
              {STOCK_CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} — Lagi Happening
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-[var(--text-faint)] mt-1">
            Butuh API key gratis dari twelvedata.com untuk saham AS, emas &
            forex — lihat catatan di bawah
          </p>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-md bg-[var(--badge-sky-bg)] text-[var(--badge-sky-text)] hover:bg-sky-800 transition-colors"
        >
          {showAddForm ? "Batal" : "+ Tambah Saham"}
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
            placeholder={
              newMarket === "forex" ? "Contoh: USDIDR atau GBP/USD" : "Contoh: TSLA atau BBCA"
            }
            className="bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)]"
          />
          <select
            value={newMarket}
            onChange={(e) =>
              setNewMarket(e.target.value as "us" | "idx" | "forex")
            }
            className="bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)]"
          >
            <option value="us">Saham AS</option>
            <option value="idx">Saham IDX</option>
            <option value="forex">Forex</option>
          </select>
          <button
            type="submit"
            className="text-xs px-4 py-2 rounded-md bg-sky-600 text-[var(--text-primary)] hover:bg-sky-500 transition-colors"
          >
            Tambah
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {!isMyWatchlist && trendingLoading && (
          <div className="col-span-full text-sm text-[var(--text-muted)] text-center py-6">
            Memuat trending {viewMode}...
          </div>
        )}
        {!isMyWatchlist && trendingError && (
          <div className="col-span-full text-sm text-[var(--badge-red-text)] text-center py-6">
            {trendingError}
          </div>
        )}

        {displayedItems.map((item, i) => (
          <StockPriceCard
            key={`${item.symbol}-${item.market}-${i}`}
            symbol={item.symbol}
            market={item.market}
            label={item.label}
            onRemove={isMyWatchlist ? () => removeItem(i) : undefined}
            onAdd={
              !isMyWatchlist &&
              !items.some(
                (existing) =>
                  existing.symbol === item.symbol && existing.market === item.market
              )
                ? () => addItemDirect(item.symbol, item.market)
                : undefined
            }
          />
        ))}

        {isMyWatchlist && items.length === 0 && (
          <div className="col-span-full text-sm text-[var(--text-muted)] text-center py-6 border border-dashed border-[var(--border-card)] rounded-xl">
            Watchlist kosong. Klik &quot;+ Tambah Saham&quot; untuk mulai.
          </div>
        )}
      </div>

      <p className="text-[11px] text-[var(--text-faint)] mt-3 mb-6">
        Sumber data: Yahoo Finance (utama, tidak resmi tapi limit longgar) →
        Finnhub (cadangan saham AS, kalau API key diisi) → Twelve Data
        (cadangan terakhir). Kalau semua gagal, error akan ditampilkan jelas
        di kartu. Mau cek stabilitas USDT? Tambah pasangan &quot;USDIDR&quot;
        di sini untuk rujukan kurs asli, lalu bandingkan manual dengan harga
        USDT di watchlist crypto.
      </p>

      <StockAnalysis items={displayedItems} />
    </div>
  );
}

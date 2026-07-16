"use client";

import { useEffect, useState } from "react";
import LivePrice from "./LivePrice";
import AnalysisSection from "./AnalysisSection";
import { MARKET_CATEGORIES } from "@/lib/marketCategories";

const STORAGE_KEY = "trading-dashboard-watchlist";

const DEFAULT_WATCHLIST = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "ADAUSDT",
];

function loadWatchlist(): string[] {
  if (typeof window === "undefined") return DEFAULT_WATCHLIST;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WATCHLIST;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

function saveWatchlist(symbols: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  } catch {
    // localStorage penuh/diblokir — tidak fatal, cukup diabaikan
  }
}

const MY_WATCHLIST_VALUE = "__my_watchlist__";

export default function Watchlist() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_WATCHLIST);
  const [hydrated, setHydrated] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addError, setAddError] = useState("");

  // Dropdown: "Watchlist Saya" ATAU salah satu kategori. Ini yang
  // menentukan apa yang ditampilkan di grid utama di bawah.
  const [viewMode, setViewMode] = useState(MY_WATCHLIST_VALUE);
  const [trendingSymbols, setTrendingSymbols] = useState<string[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSymbols(loadWatchlist());
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Ambil data trending setiap kali kategori dipilih. setTrendingLoading/
  // setTrendingError di awal effect ini WAJAR (bukan derived state) —
  // ini pola standar "fetch on effect": reset status sebelum request baru,
  // lalu update lagi setelah response datang.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (viewMode === MY_WATCHLIST_VALUE) return;

    let cancelled = false;
    setTrendingLoading(true);
    setTrendingError("");

    fetch(`/api/trending?category=${encodeURIComponent(viewMode)}`, {
      cache: "no-store",
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (cancelled) return;
        if (!ok) throw new Error(json.error || "Gagal memuat trending");
        setTrendingSymbols(
          (json.movers as { symbol: string }[]).map((m) => m.symbol)
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

  function addSymbol(e: React.FormEvent) {
    e.preventDefault();
    const clean = newSymbol.trim().toUpperCase();

    if (!clean) return;
    if (!clean.endsWith("USDT")) {
      setAddError('Symbol harus diakhiri "USDT", contoh: DOGEUSDT');
      return;
    }
    if (symbols.includes(clean)) {
      setAddError("Koin ini sudah ada di watchlist");
      return;
    }

    const updated = [...symbols, clean];
    setSymbols(updated);
    saveWatchlist(updated);
    setNewSymbol("");
    setAddError("");
    setShowAddForm(false);
  }

  function addSymbolDirect(symbol: string) {
    if (symbols.includes(symbol)) return;
    const updated = [...symbols, symbol];
    setSymbols(updated);
    saveWatchlist(updated);
  }

  function removeSymbol(symbol: string) {
    const updated = symbols.filter((s) => s !== symbol);
    setSymbols(updated);
    saveWatchlist(updated);
  }

  if (!hydrated) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {DEFAULT_WATCHLIST.map((s) => (
          <div
            key={s}
            className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5 h-[110px] animate-pulse"
          />
        ))}
      </div>
    );
  }

  const isMyWatchlist = viewMode === MY_WATCHLIST_VALUE;
  const displayedSymbols = isMyWatchlist ? symbols : trendingSymbols;

  return (
    <>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
            Watchlist
          </span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)]"
          >
            <option value={MY_WATCHLIST_VALUE}>Watchlist Saya</option>
            {MARKET_CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} — Lagi Happening
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-md bg-[var(--badge-sky-bg)] text-[var(--badge-sky-text)] hover:bg-sky-800 transition-colors"
        >
          {showAddForm ? "Batal" : "+ Tambah Koin"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={addSymbol}
          className="flex flex-wrap items-start gap-2 mb-4 p-3 rounded-lg bg-[var(--bg-card-secondary)]/50"
        >
          <div>
            <input
              value={newSymbol}
              onChange={(e) => {
                setNewSymbol(e.target.value);
                setAddError("");
              }}
              placeholder="Contoh: DOGEUSDT"
              className="bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)]"
              autoFocus
            />
            {addError && (
              <div className="text-xs text-[var(--badge-red-text)] mt-1">{addError}</div>
            )}
          </div>
          <button
            type="submit"
            className="text-xs px-4 py-2 rounded-md bg-sky-600 text-[var(--text-primary)] hover:bg-sky-500 transition-colors"
          >
            Tambah
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

        {displayedSymbols.map((s) => (
          <LivePrice
            key={s}
            symbol={s.toLowerCase()}
            onRemove={isMyWatchlist ? () => removeSymbol(s) : undefined}
            onAdd={
              !isMyWatchlist && !symbols.includes(s)
                ? () => addSymbolDirect(s)
                : undefined
            }
          />
        ))}

        {isMyWatchlist && symbols.length === 0 && (
          <div className="col-span-full text-sm text-[var(--text-muted)] text-center py-6 border border-dashed border-[var(--border-card)] rounded-xl">
            Watchlist kosong. Klik &quot;+ Tambah Koin&quot; untuk mulai.
          </div>
        )}
      </div>

      <AnalysisSection availableSymbols={displayedSymbols} />
    </>
  );
}

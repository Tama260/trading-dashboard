"use client";

import { useEffect, useState } from "react";
import LivePrice from "./LivePrice";
import AnalysisSection from "./AnalysisSection";

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

export default function Watchlist() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_WATCHLIST);
  const [hydrated, setHydrated] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addError, setAddError] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSymbols(loadWatchlist());
    setHydrated(true);
  }, []);
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
            className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 h-[110px] animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-neutral-500 uppercase tracking-wide">
          Watchlist
        </span>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-md bg-sky-900 text-sky-300 hover:bg-sky-800 transition-colors"
        >
          {showAddForm ? "Batal" : "+ Tambah Koin"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={addSymbol}
          className="flex flex-wrap items-start gap-2 mb-4 p-3 rounded-lg bg-neutral-800/50"
        >
          <div>
            <input
              value={newSymbol}
              onChange={(e) => {
                setNewSymbol(e.target.value);
                setAddError("");
              }}
              placeholder="Contoh: DOGEUSDT"
              className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-sm text-white"
              autoFocus
            />
            {addError && (
              <div className="text-xs text-red-400 mt-1">{addError}</div>
            )}
          </div>
          <button
            type="submit"
            className="text-xs px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-500 transition-colors"
          >
            Tambah
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {symbols.map((s) => (
          <LivePrice
            key={s}
            symbol={s.toLowerCase()}
            onRemove={() => removeSymbol(s)}
          />
        ))}
        {symbols.length === 0 && (
          <div className="col-span-full text-sm text-neutral-500 text-center py-6 border border-dashed border-neutral-800 rounded-xl">
            Watchlist kosong. Klik &quot;+ Tambah Koin&quot; untuk mulai.
          </div>
        )}
      </div>

      <AnalysisSection availableSymbols={symbols} />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { STOCK_CATEGORIES } from "@/lib/marketCategories";

type Mover = {
  symbol: string;
  price: string;
  changePercent: string;
};

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 menit — jaga kuota Twelve Data

export default function StockTrendingByCategory({
  onAddToWatchlist,
}: {
  onAddToWatchlist: (symbol: string, market: "us" | "idx") => void;
}) {
  const [categoryName, setCategoryName] = useState(STOCK_CATEGORIES[0].name);
  const [movers, setMovers] = useState<Mover[]>([]);
  const [market, setMarket] = useState<"us" | "idx">("us");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/stocks-trending?category=${encodeURIComponent(categoryName)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal memuat trending");
        if (!cancelled) {
          setMovers(json.movers ?? []);
          setMarket(json.market);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(load, POLL_INTERVAL_MS);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [categoryName]);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <label className="text-xs text-neutral-500 uppercase tracking-wide">
          Saham Lagi Happening:
        </label>
        <select
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-white"
        >
          {STOCK_CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        {loading && movers.length === 0 && (
          <div className="text-sm text-neutral-500">Memuat...</div>
        )}
        {error && <div className="text-sm text-red-400">{error}</div>}
        {!loading && !error && movers.length === 0 && (
          <div className="text-sm text-neutral-500">
            Data tidak tersedia (cek API key Twelve Data kalau ini kategori
            Saham Luar)
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {movers.map((m) => {
            const isUp = parseFloat(m.changePercent) >= 0;
            return (
              <div
                key={m.symbol}
                className="flex items-center justify-between p-3 rounded-lg bg-neutral-800/40 text-sm"
              >
                <div>
                  <div className="font-medium text-neutral-200">
                    {m.symbol}
                  </div>
                  <div className="text-xs text-neutral-500">${m.price}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs ${
                      isUp ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {isUp ? "▲" : "▼"} {m.changePercent}%
                  </span>
                  <button
                    onClick={() => onAddToWatchlist(m.symbol, market)}
                    title="Tambah ke watchlist"
                    className="text-neutral-600 hover:text-sky-400 w-5 h-5 flex items-center justify-center rounded-full hover:bg-neutral-800"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

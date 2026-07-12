"use client";

import { useEffect, useState } from "react";

type Mover = {
  symbol: string;
  price: string;
  changePercent: string;
};

type CategoryResult = {
  category: string;
  movers: Mover[];
};

const POLL_INTERVAL_MS = 60000; // data trending tidak perlu se-realtime harga

export default function TrendingByCategory({
  onAddToWatchlist,
}: {
  onAddToWatchlist: (symbol: string) => void;
}) {
  const [categories, setCategories] = useState<CategoryResult[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function load() {
      try {
        const res = await fetch("/api/trending", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal memuat trending");
        if (!cancelled) {
          setCategories(json.categories);
          setError("");
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan");
          setLoading(false);
        }
      } finally {
        if (!cancelled) timer = setTimeout(load, POLL_INTERVAL_MS);
      }
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-neutral-500 mb-6">
        Memuat data trending per kategori...
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-400 mb-6">{error}</div>;
  }

  return (
    <div className="mb-6">
      <span className="text-xs text-neutral-500 uppercase tracking-wide block mb-3">
        Yang Lagi Happening (Crypto)
      </span>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.category}
            className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <div className="text-sm font-medium text-neutral-300 mb-3">
              {cat.category}
            </div>
            {cat.movers.length === 0 ? (
              <div className="text-xs text-neutral-600">Data tidak tersedia</div>
            ) : (
              <div className="space-y-2">
                {cat.movers.map((m) => {
                  const isUp = parseFloat(m.changePercent) >= 0;
                  return (
                    <div
                      key={m.symbol}
                      className="flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="text-neutral-300 font-medium">
                          {m.symbol.replace("USDT", "")}
                        </span>
                        <span className="text-neutral-600 ml-2">
                          ${m.price}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={isUp ? "text-green-400" : "text-red-400"}
                        >
                          {isUp ? "▲" : "▼"} {m.changePercent}%
                        </span>
                        <button
                          onClick={() => onAddToWatchlist(m.symbol)}
                          title="Tambah ke watchlist"
                          className="text-neutral-600 hover:text-sky-400 w-4 h-4 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-neutral-600 mt-3">
        Saham, emas, dan aset non-crypto belum tersedia — butuh sumber data
        terpisah yang belum dibangun.
      </p>
    </div>
  );
}

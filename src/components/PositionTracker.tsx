"use client";

import { useEffect, useState } from "react";

type Position = {
  id: string;
  symbol: string;
  side: "long" | "short";
  entryPrice: number;
  size: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: number;
  status: "open" | "closed";
  closedPrice?: number;
  closedAt?: number;
};

const STORAGE_KEY = "trading-dashboard-positions";

function loadPositions(): Position[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Position[]) : [];
  } catch {
    return [];
  }
}

function savePositions(positions: Position[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // localStorage penuh/diblokir browser — tidak fatal, cukup diabaikan
  }
}

export default function PositionTracker() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [symbol, setSymbol] = useState("BTCUSDT");
  const [side, setSide] = useState<"long" | "short">("long");
  const [entryPrice, setEntryPrice] = useState("");
  const [size, setSize] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  // Load dari localStorage HANYA setelah mount di client — kalau dibaca
  // langsung saat render pertama, akan mismatch dengan hasil render di
  // server (yang tidak punya akses localStorage) dan bikin warning hydration.
  // localStorage adalah "external system" sinkron, ini pola standar untuk
  // baca sekali saat mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPositions(loadPositions());
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const openSymbols = Array.from(
      new Set(positions.filter((p) => p.status === "open").map((p) => p.symbol))
    );
    if (openSymbols.length === 0) return;

    let cancelled = false;

    async function fetchPrices() {
      const updates: Record<string, number> = {};
      await Promise.all(
        openSymbols.map(async (s) => {
          try {
            const res = await fetch(`/api/prices?symbol=${s}`, {
              cache: "no-store",
            });
            const json = await res.json();
            if (res.ok) updates[s] = parseFloat(json.price);
          } catch {
            // biarkan, harga terakhir yang berhasil tetap dipakai
          }
        })
      );
      if (!cancelled) setPrices((prev) => ({ ...prev, ...updates }));
    }

    fetchPrices();
    const timer = setInterval(fetchPrices, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [positions]);

  function addPosition(e: React.FormEvent) {
    e.preventDefault();
    const entry = parseFloat(entryPrice);
    const sz = parseFloat(size);
    if (!symbol || isNaN(entry) || isNaN(sz) || entry <= 0 || sz <= 0) return;

    const newPosition: Position = {
      id: `${Date.now()}`,
      symbol: symbol.toUpperCase(),
      side,
      entryPrice: entry,
      size: sz,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      openedAt: Date.now(),
      status: "open",
    };

    const updated = [...positions, newPosition];
    setPositions(updated);
    savePositions(updated);
    setShowForm(false);
    setEntryPrice("");
    setSize("");
    setStopLoss("");
    setTakeProfit("");
  }

  function closePosition(id: string) {
    const pos = positions.find((p) => p.id === id);
    if (!pos) return;
    const currentPrice = prices[pos.symbol];

    const updated = positions.map((p) =>
      p.id === id
        ? {
            ...p,
            status: "closed" as const,
            closedPrice: currentPrice ?? p.entryPrice,
            closedAt: Date.now(),
          }
        : p
    );
    setPositions(updated);
    savePositions(updated);
  }

  function deletePosition(id: string) {
    const updated = positions.filter((p) => p.id !== id);
    setPositions(updated);
    savePositions(updated);
  }

  function calcPnl(pos: Position): number | null {
    const price = pos.status === "closed" ? pos.closedPrice : prices[pos.symbol];
    if (price === undefined) return null;
    const diff =
      pos.side === "long" ? price - pos.entryPrice : pos.entryPrice - price;
    return diff * pos.size;
  }

  const openPositions = positions.filter((p) => p.status === "open");
  const closedPositions = positions.filter((p) => p.status === "closed");

  const totalUnrealizedPnl = openPositions.reduce((sum, p) => {
    const pnl = calcPnl(p);
    return sum + (pnl ?? 0);
  }, 0);

  // Sebelum hydrated, jangan render isi (hindari flicker/mismatch) — cukup
  // tampilkan shell kosong
  if (!hydrated) {
    return (
      <div className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5">
        <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
          Position Tracker
        </span>
        <div className="text-sm text-[var(--text-muted)] mt-3">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
            Position Tracker
          </span>
          <p className="text-[11px] text-[var(--text-faint)] mt-0.5">
            Data tersimpan lokal di browser kamu, bukan di server
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-md bg-[var(--badge-sky-bg)] text-[var(--badge-sky-text)] hover:bg-sky-800 transition-colors"
        >
          {showForm ? "Batal" : "+ Tambah Posisi"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={addPosition}
          className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5 p-4 rounded-lg bg-[var(--bg-card-secondary)]/50 text-sm"
        >
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">
              Symbol
            </label>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="BTCUSDT"
              className="w-full bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded px-2 py-1.5 text-[var(--text-primary)]"
              required
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">
              Arah
            </label>
            <select
              value={side}
              onChange={(e) => setSide(e.target.value as "long" | "short")}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded px-2 py-1.5 text-[var(--text-primary)]"
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">
              Entry Price
            </label>
            <input
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded px-2 py-1.5 text-[var(--text-primary)]"
              required
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">
              Size
            </label>
            <input
              type="number"
              step="any"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded px-2 py-1.5 text-[var(--text-primary)]"
              required
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">
              Stop Loss (opsional)
            </label>
            <input
              type="number"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded px-2 py-1.5 text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">
              Take Profit (opsional)
            </label>
            <input
              type="number"
              step="any"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded px-2 py-1.5 text-[var(--text-primary)]"
            />
          </div>
          <div className="col-span-2 md:col-span-3">
            <button
              type="submit"
              className="text-xs px-4 py-2 rounded-md bg-sky-600 text-[var(--text-primary)] hover:bg-sky-500 transition-colors"
            >
              Simpan Posisi
            </button>
          </div>
        </form>
      )}

      {openPositions.length > 0 && (
        <div className="mb-3 text-xs text-[var(--text-muted)]">
          Total Unrealized P&L:{" "}
          <span
            className={
              totalUnrealizedPnl >= 0 ? "text-[var(--badge-green-text)]" : "text-[var(--badge-red-text)]"
            }
          >
            {totalUnrealizedPnl >= 0 ? "+" : ""}
            {totalUnrealizedPnl.toFixed(2)} USDT
          </span>
        </div>
      )}

      <div className="space-y-2">
        {positions.length === 0 && (
          <div className="text-sm text-[var(--text-muted)] text-center py-6">
            Belum ada posisi. Klik &quot;+ Tambah Posisi&quot; untuk mulai
            tracking.
          </div>
        )}

        {openPositions.map((pos) => {
          const pnl = calcPnl(pos);
          return (
            <div
              key={pos.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-[var(--bg-card-secondary)]/40 text-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    pos.side === "long"
                      ? "bg-[var(--badge-green-bg)] text-[var(--badge-green-text)]"
                      : "bg-[var(--badge-red-bg)] text-[var(--badge-red-text)]"
                  }`}
                >
                  {pos.side.toUpperCase()}
                </span>
                <span className="font-medium">{pos.symbol}</span>
                <span className="text-[var(--text-muted)] text-xs">
                  Entry {pos.entryPrice} · Size {pos.size}
                </span>
              </div>
              <div className="flex items-center gap-4">
                {pnl !== null ? (
                  <span
                    className={`text-sm font-semibold ${
                      pnl >= 0 ? "text-[var(--badge-green-text)]" : "text-[var(--badge-red-text)]"
                    }`}
                  >
                    {pnl >= 0 ? "+" : ""}
                    {pnl.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-xs text-[var(--text-faint)]">
                    memuat harga...
                  </span>
                )}
                <button
                  onClick={() => closePosition(pos.id)}
                  className="text-xs px-2 py-1 rounded bg-[var(--bg-card-tertiary)] hover:bg-[var(--bg-card-tertiary)] text-[var(--text-secondary)]"
                >
                  Tutup
                </button>
                <button
                  onClick={() => deletePosition(pos.id)}
                  className="text-xs text-[var(--text-faint)] hover:text-[var(--badge-red-text)]"
                >
                  Hapus
                </button>
              </div>
            </div>
          );
        })}

        {closedPositions.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)]">
              Riwayat posisi tertutup ({closedPositions.length})
            </summary>
            <div className="space-y-2 mt-2">
              {closedPositions.map((pos) => {
                const pnl = calcPnl(pos);
                return (
                  <div
                    key={pos.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-[var(--bg-card-secondary)]/20 text-sm opacity-70"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-card-tertiary)] text-[var(--text-tertiary)]">
                        {pos.side.toUpperCase()}
                      </span>
                      <span className="font-medium">{pos.symbol}</span>
                      <span className="text-[var(--text-muted)] text-xs">
                        {pos.entryPrice} → {pos.closedPrice}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {pnl !== null && (
                        <span
                          className={`text-sm font-semibold ${
                            pnl >= 0 ? "text-[var(--badge-green-text)]" : "text-[var(--badge-red-text)]"
                          }`}
                        >
                          {pnl >= 0 ? "+" : ""}
                          {pnl.toFixed(2)}
                        </span>
                      )}
                      <button
                        onClick={() => deletePosition(pos.id)}
                        className="text-xs text-[var(--text-faint)] hover:text-[var(--badge-red-text)]"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

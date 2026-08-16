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
  notes?: string;
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
  const [notes, setNotes] = useState("");

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

  // TradeSetupPanel bisa "ngirim" data setup lewat event ini (tombol "Log
  // Trade Ini") — form Trade Journal langsung kebuka & keisi otomatis,
  // biar journaling gak jadi hambatan pas lagi cepat-cepatan (scalping
  // khususnya, kalau isi form manual tiap kali malah gak bakal dipakai)
  useEffect(() => {
    function handlePrefill(e: Event) {
      const detail = (e as CustomEvent<{
        symbol: string;
        side: "long" | "short";
        entryPrice: number;
        stopLoss?: number;
        takeProfit?: number;
        notes?: string;
      }>).detail;
      if (!detail) return;

      setSymbol(detail.symbol);
      setSide(detail.side);
      setEntryPrice(String(detail.entryPrice));
      setStopLoss(detail.stopLoss !== undefined ? String(detail.stopLoss) : "");
      setTakeProfit(detail.takeProfit !== undefined ? String(detail.takeProfit) : "");
      setNotes(detail.notes ?? "");
      setShowForm(true);
      document.getElementById("trade-journal")?.scrollIntoView({ behavior: "smooth" });
    }
    window.addEventListener("journal:prefill", handlePrefill);
    return () => window.removeEventListener("journal:prefill", handlePrefill);
  }, []);

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
      notes: notes.trim() || undefined,
    };

    const updated = [...positions, newPosition];
    setPositions(updated);
    savePositions(updated);
    setShowForm(false);
    setEntryPrice("");
    setSize("");
    setStopLoss("");
    setTakeProfit("");
    setNotes("");
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

  // R-multiple: seberapa besar untung/rugi RELATIF ke risiko yang
  // direncanakan (jarak entry-SL) — angka ini yang beneran ngukur disiplin
  // trading, bukan cuma nominal PnL mentah yang gampang bias sama size
  // posisi yang beda-beda tiap trade
  function calcRMultiple(pos: Position): number | null {
    if (pos.status !== "closed" || pos.closedPrice === undefined || !pos.stopLoss) {
      return null;
    }
    const riskPerUnit = Math.abs(pos.entryPrice - pos.stopLoss);
    if (riskPerUnit <= 0) return null;
    const pnlPerUnit =
      pos.side === "long" ? pos.closedPrice - pos.entryPrice : pos.entryPrice - pos.closedPrice;
    return pnlPerUnit / riskPerUnit;
  }

  const openPositions = positions.filter((p) => p.status === "open");
  const closedPositions = positions.filter((p) => p.status === "closed");

  const totalUnrealizedPnl = openPositions.reduce((sum, p) => {
    const pnl = calcPnl(p);
    return sum + (pnl ?? 0);
  }, 0);

  // Statistik jurnal — cuma dihitung dari posisi yang udah closed, dan
  // diurutkan berdasarkan closedAt biar streak-nya bener (kronologis)
  const sortedClosed = [...closedPositions].sort(
    (a, b) => (a.closedAt ?? 0) - (b.closedAt ?? 0)
  );
  const closedPnls = sortedClosed.map((p) => calcPnl(p));
  const wins = closedPnls.filter((p) => p !== null && p > 0).length;
  const losses = closedPnls.filter((p) => p !== null && p <= 0).length;
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
  const totalRealizedPnl = closedPnls.reduce<number>((s, p) => s + (p ?? 0), 0);

  const rMultiples = sortedClosed
    .map((p) => calcRMultiple(p))
    .filter((r): r is number => r !== null);
  const avgR = rMultiples.length > 0 ? rMultiples.reduce((s, r) => s + r, 0) / rMultiples.length : null;

  // Streak: jalan dari yang PALING BARU mundur ke belakang, hitung berapa
  // kali berturut-turut hasilnya sama (semua win atau semua loss)
  let currentStreak = 0;
  let streakType: "win" | "loss" | null = null;
  for (let i = sortedClosed.length - 1; i >= 0; i--) {
    const pnl = closedPnls[i];
    if (pnl === null) break;
    const type = pnl > 0 ? "win" : "loss";
    if (streakType === null) {
      streakType = type;
      currentStreak = 1;
    } else if (type === streakType) {
      currentStreak++;
    } else {
      break;
    }
  }

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
    <div id="trade-journal" className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
            📓 Trade Journal
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
            <label className="text-xs text-[var(--text-muted)] block mb-1">
              Catatan (opsional) — kenapa entry di sini, apa yang mau dievaluasi nanti
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="mis. breakout dari kompresi volatilitas, ADX 28"
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

      {closedPositions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
          <div className="p-2.5 rounded-lg bg-[var(--bg-card-secondary)]/40">
            <div className="text-[var(--text-faint)]">Win Rate</div>
            <div
              className="font-semibold text-sm"
              style={{ color: winRate >= 50 ? "#22c55e" : "#ef4444" }}
            >
              {winRate.toFixed(0)}% ({wins}W/{losses}L)
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--bg-card-secondary)]/40">
            <div className="text-[var(--text-faint)]">Avg R</div>
            <div
              className="font-semibold text-sm"
              style={{ color: (avgR ?? 0) >= 0 ? "#22c55e" : "#ef4444" }}
            >
              {avgR !== null ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R` : "—"}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--bg-card-secondary)]/40">
            <div className="text-[var(--text-faint)]">Realized P&amp;L</div>
            <div
              className="font-semibold text-sm"
              style={{ color: totalRealizedPnl >= 0 ? "#22c55e" : "#ef4444" }}
            >
              {totalRealizedPnl >= 0 ? "+" : ""}
              {totalRealizedPnl.toFixed(2)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--bg-card-secondary)]/40">
            <div className="text-[var(--text-faint)]">Streak</div>
            <div
              className="font-semibold text-sm"
              style={{ color: streakType === "win" ? "#22c55e" : streakType === "loss" ? "#ef4444" : undefined }}
            >
              {streakType ? `${currentStreak}x ${streakType === "win" ? "Win" : "Loss"}` : "—"}
            </div>
          </div>
        </div>
      )}
      {avgR === null && closedPositions.length > 0 && (
        <p className="text-[10px] text-[var(--text-faint)] -mt-2 mb-4">
          Avg R cuma kehitung buat posisi yang diisi Stop Loss-nya pas dicatat.
        </p>
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
                const r = calcRMultiple(pos);
                return (
                  <div
                    key={pos.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-[var(--bg-card-secondary)]/20 text-sm opacity-70"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-card-tertiary)] text-[var(--text-tertiary)]">
                        {pos.side.toUpperCase()}
                      </span>
                      <span className="font-medium">{pos.symbol}</span>
                      <span className="text-[var(--text-muted)] text-xs">
                        {pos.entryPrice} → {pos.closedPrice}
                      </span>
                      {r !== null && (
                        <span className="text-[10px]" style={{ color: r >= 0 ? "#22c55e" : "#ef4444" }}>
                          {r >= 0 ? "+" : ""}
                          {r.toFixed(2)}R
                        </span>
                      )}
                      {pos.notes && (
                        <span className="text-[10px] text-[var(--text-faint)] italic">
                          &quot;{pos.notes}&quot;
                        </span>
                      )}
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

"use client";

import { useEffect, useRef, useState } from "react";

type LivePriceProps = {
  symbol: string; // contoh: "btcusdt"
  onRemove?: () => void; // kalau diisi, muncul tombol × (hapus dari watchlist)
  onAdd?: () => void; // kalau diisi, muncul tombol + (tambah ke watchlist)
};

type TickerData = {
  price: string;
  changePercent: string;
  high: string;
  low: string;
};

const POLL_INTERVAL_MS = 3000;

// Komponen ini TIDAK lagi konek langsung ke Binance dari browser.
// Ia bertanya ke "/api/prices" (server milik kita sendiri di Next.js),
// dan server itu yang meneruskan ke Binance. Ini menghindari blokir ISP
// yang berlaku di level browser/perangkat pengguna.
export default function LivePrice({ symbol, onRemove, onAdd }: LivePriceProps) {
  const [data, setData] = useState<TickerData | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "error">(
    "connecting"
  );
  const [errorReason, setErrorReason] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrice() {
      try {
        const res = await fetch(`/api/prices?symbol=${symbol}`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Gagal mengambil data");
        }

        if (!cancelled) {
          setData(json);
          setStatus("live");
          setErrorReason("");
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorReason(
            err instanceof Error ? err.message : "Terjadi kesalahan"
          );
        }
      } finally {
        if (!cancelled) {
          timerRef.current = setTimeout(fetchPrice, POLL_INTERVAL_MS);
        }
      }
    }

    fetchPrice();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [symbol]);

  const isUp = data ? parseFloat(data.changePercent) >= 0 : true;

  return (
    <div className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-[var(--text-tertiary)] uppercase tracking-wide">
          {symbol.replace("usdt", "").toUpperCase()} / USDT
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              status === "live"
                ? "bg-[var(--badge-green-bg)] text-[var(--badge-green-text)]"
                : status === "connecting"
                ? "bg-[var(--badge-yellow-bg)] text-[var(--badge-yellow-text)]"
                : "bg-[var(--badge-red-bg)] text-[var(--badge-red-text)]"
            }`}
          >
            {status === "live"
              ? "● LIVE"
              : status === "connecting"
              ? "Connecting..."
              : "Error"}
          </span>
          {onRemove && (
            <button
              onClick={onRemove}
              title="Hapus dari watchlist"
              className="text-[var(--text-faint)] hover:text-[var(--badge-red-text)] text-sm w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--bg-card-secondary)]"
            >
              ×
            </button>
          )}
          {onAdd && (
            <button
              onClick={onAdd}
              title="Tambah ke watchlist"
              className="text-[var(--text-faint)] hover:text-[var(--badge-sky-text)] text-sm w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--bg-card-secondary)]"
            >
              +
            </button>
          )}
        </div>
      </div>

      {data ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-[var(--text-primary)]">
              ${data.price}
            </span>
            <span
              className={`text-sm font-medium ${
                isUp ? "text-[var(--badge-green-text)]" : "text-[var(--badge-red-text)]"
              }`}
            >
              {isUp ? "▲" : "▼"} {data.changePercent}%
            </span>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-[var(--text-muted)]">
            <span>
              24H High: <span className="text-[var(--text-secondary)]">${data.high}</span>
            </span>
            <span>
              24H Low: <span className="text-[var(--text-secondary)]">${data.low}</span>
            </span>
          </div>
        </>
      ) : (
        <div className="text-[var(--text-muted)] text-sm">
          {status === "error" && errorReason
            ? errorReason
            : "Menunggu data..."}
        </div>
      )}
    </div>
  );
}

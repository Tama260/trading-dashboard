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
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-400 uppercase tracking-wide">
          {symbol.replace("usdt", "").toUpperCase()} / USDT
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              status === "live"
                ? "bg-green-900 text-green-400"
                : status === "connecting"
                ? "bg-yellow-900 text-yellow-400"
                : "bg-red-900 text-red-400"
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
              className="text-neutral-600 hover:text-red-400 text-sm w-5 h-5 flex items-center justify-center rounded-full hover:bg-neutral-800"
            >
              ×
            </button>
          )}
          {onAdd && (
            <button
              onClick={onAdd}
              title="Tambah ke watchlist"
              className="text-neutral-600 hover:text-sky-400 text-sm w-5 h-5 flex items-center justify-center rounded-full hover:bg-neutral-800"
            >
              +
            </button>
          )}
        </div>
      </div>

      {data ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-white">
              ${data.price}
            </span>
            <span
              className={`text-sm font-medium ${
                isUp ? "text-green-400" : "text-red-400"
              }`}
            >
              {isUp ? "▲" : "▼"} {data.changePercent}%
            </span>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-neutral-500">
            <span>
              24H High: <span className="text-neutral-300">${data.high}</span>
            </span>
            <span>
              24H Low: <span className="text-neutral-300">${data.low}</span>
            </span>
          </div>
        </>
      ) : (
        <div className="text-neutral-500 text-sm">
          {status === "error" && errorReason
            ? errorReason
            : "Menunggu data..."}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

type StockPriceCardProps = {
  symbol: string;
  market: "us" | "idx" | "gold" | "forex";
  label: string; // nama tampilan, misal "AAPL" atau "Emas (XAU/USD)"
  onRemove?: () => void;
};

type Quote = {
  price: string;
  changePercent: string;
  high: string;
  low: string;
};

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 menit — kuota Twelve Data 800/hari harus dihemat serius

export default function StockPriceCard({
  symbol,
  market,
  label,
  onRemove,
}: StockPriceCardProps) {
  const [data, setData] = useState<Quote | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "error">(
    "connecting"
  );
  const [errorReason, setErrorReason] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrice() {
      try {
        const query =
          market === "gold"
            ? `market=gold`
            : `symbol=${encodeURIComponent(symbol)}&market=${market}`;
        const res = await fetch(`/api/stocks?${query}`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok) throw new Error(json.error || "Gagal mengambil data");

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
  }, [symbol, market]);

  const isUp = data ? parseFloat(data.changePercent) >= 0 : true;

  const marketBadge = {
    us: "US",
    idx: "IDX",
    gold: "GOLD",
    forex: "FX",
  }[market];

  return (
    <div className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-tertiary)] uppercase tracking-wide">
            {label}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-card-secondary)] text-[var(--text-muted)]">
            {marketBadge}
          </span>
        </div>
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
              title="Hapus"
              className="text-[var(--text-faint)] hover:text-[var(--badge-red-text)] text-sm w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--bg-card-secondary)]"
            >
              ×
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
              High: <span className="text-[var(--text-secondary)]">${data.high}</span>
            </span>
            <span>
              Low: <span className="text-[var(--text-secondary)]">${data.low}</span>
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

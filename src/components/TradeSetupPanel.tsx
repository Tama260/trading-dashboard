"use client";

import { useEffect, useState } from "react";
import DrawableChart, { Annotation } from "./DrawableChart";

type SetupResult = {
  bias: "Bullish" | "Bearish" | "Neutral";
  confidence: number;
  breakout: boolean;
  checklist: { label: string; passed: boolean }[];
  levels: {
    resistance: number;
    support: number;
    entryLow: number;
    entryHigh: number;
    stopLoss: number;
    tp1: number;
    tp2: number;
  };
};

const POLL_INTERVAL_MS = 30000; // level setup tidak perlu se-realtime harga

export default function TradeSetupPanel({
  symbol,
  interval = "1h",
}: {
  symbol: string;
  interval?: string;
}) {
  const [data, setData] = useState<SetupResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function load() {
      try {
        const res = await fetch(
          `/api/setup?symbol=${symbol}&interval=${interval}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal memuat setup");
        if (!cancelled) {
          setData(json);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan");
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
  }, [symbol, interval]);

  const annotations: Annotation[] = data
    ? [
        {
          type: "hline",
          price: data.levels.resistance,
          label: "Resistance",
          color: "#f97316",
        },
        {
          type: "hline",
          price: data.levels.support,
          label: "Support",
          color: "#f97316",
        },
        {
          type: "zone",
          priceLow: data.levels.entryLow,
          priceHigh: data.levels.entryHigh,
          label: "Entry Zone",
          color: "#38bdf8",
        },
        {
          type: "hline",
          price: data.levels.stopLoss,
          label: "SL",
          color: "#ef4444",
        },
        { type: "hline", price: data.levels.tp1, label: "TP1", color: "#22c55e" },
        { type: "hline", price: data.levels.tp2, label: "TP2", color: "#22c55e" },
      ]
    : [];

  const biasColor =
    data?.bias === "Bullish"
      ? "text-green-400"
      : data?.bias === "Bearish"
      ? "text-red-400"
      : "text-orange-400";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-neutral-500 uppercase tracking-wide">
            Setup Detection — {symbol} ({interval})
          </span>
          {data && (
            <span className="text-xs text-neutral-500">
              Confidence:{" "}
              <span className="text-neutral-300">{data.confidence}%</span>
            </span>
          )}
        </div>

        {error && <div className="text-sm text-red-400">{error}</div>}
        {!data && !error && (
          <div className="text-sm text-neutral-500">Menganalisis...</div>
        )}

        {data && (
          <>
            <div className={`text-2xl font-semibold mb-3 ${biasColor}`}>
              {data.bias}{" "}
              {data.breakout && (
                <span className="text-sm text-neutral-400 font-normal">
                  (Breakout Terkonfirmasi)
                </span>
              )}
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4">
              {data.checklist.map((item, i) => (
                <li
                  key={i}
                  className={`text-xs flex items-center gap-2 ${
                    item.passed ? "text-neutral-300" : "text-neutral-600"
                  }`}
                >
                  <span>{item.passed ? "✓" : "✗"}</span> {item.label}
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <LevelBox
                label="Entry Zone"
                value={`${data.levels.entryLow.toFixed(
                  2
                )} - ${data.levels.entryHigh.toFixed(2)}`}
                color="text-sky-400"
              />
              <LevelBox
                label="Stop Loss"
                value={data.levels.stopLoss.toFixed(2)}
                color="text-red-400"
              />
              <LevelBox
                label="TP1"
                value={data.levels.tp1.toFixed(2)}
                color="text-green-400"
              />
              <LevelBox
                label="TP2"
                value={data.levels.tp2.toFixed(2)}
                color="text-green-400"
              />
            </div>
          </>
        )}
      </div>

      <DrawableChart symbol={symbol} interval={interval} annotations={annotations} />
    </div>
  );
}

function LevelBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-neutral-800/50 p-3">
      <div className="text-neutral-500 mb-1">{label}</div>
      <div className={`font-semibold ${color}`}>{value}</div>
    </div>
  );
}

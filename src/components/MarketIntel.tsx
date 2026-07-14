"use client";

import { useEffect, useState } from "react";

type MarketIntelData = {
  regime: "Uptrend" | "Downtrend" | "Neutral";
  confidence: number;
  volatility: { level: "Low" | "Medium" | "High"; atrPercent: string };
  sentiment: { value: number; label: string } | null;
};

const POLL_INTERVAL_MS = 20000; // regime & sentiment tidak perlu se-realtime harga

export default function MarketIntel({ symbol }: { symbol: string }) {
  const [data, setData] = useState<MarketIntelData | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function load() {
      try {
        const res = await fetch(`/api/market-intel?symbol=${symbol}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal memuat data");
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
  }, [symbol]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <RegimeCard data={data} error={error} />
      <SentimentCard data={data} error={error} />
      <VolatilityCard data={data} error={error} />
    </div>
  );
}

function CardShell({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5">
      <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
        {label}
      </span>
      <div className="mt-3">
        {error ? (
          <span className="text-sm text-[var(--badge-red-text)]">{error}</span>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function RegimeCard({
  data,
  error,
}: {
  data: MarketIntelData | null;
  error: string;
}) {
  const colorMap = {
    Uptrend: "text-[var(--badge-green-text)]",
    Downtrend: "text-[var(--badge-red-text)]",
    Neutral: "text-orange-400",
  };

  return (
    <CardShell label="Market Regime" error={error}>
      {!data ? (
        <span className="text-[var(--text-muted)] text-sm">Menghitung...</span>
      ) : (
        <>
          <span className={`text-2xl font-semibold ${colorMap[data.regime]}`}>
            {data.regime}
          </span>
          <div className="mt-2 text-xs text-[var(--text-muted)]">
            Confidence:{" "}
            <span className="text-[var(--text-secondary)]">{data.confidence}%</span>
          </div>
        </>
      )}
    </CardShell>
  );
}

function SentimentCard({
  data,
  error,
}: {
  data: MarketIntelData | null;
  error: string;
}) {
  return (
    <CardShell label="Sentiment" error={error}>
      {!data ? (
        <span className="text-[var(--text-muted)] text-sm">Menghitung...</span>
      ) : !data.sentiment ? (
        <span className="text-[var(--text-muted)] text-sm">Data tidak tersedia</span>
      ) : (
        <>
          <span className="text-2xl font-semibold text-[var(--text-primary)]">
            {data.sentiment.label}
          </span>
          <div className="mt-3 h-1.5 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative">
            <div
              className="absolute -top-1 w-3 h-3 rounded-full bg-white border-2 border-[var(--border-page)]"
              style={{ left: `calc(${data.sentiment.value}% - 6px)` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)]">
            <span>Fear</span>
            <span className="text-[var(--text-secondary)]">
              {data.sentiment.value} / 100
            </span>
            <span>Greed</span>
          </div>
        </>
      )}
    </CardShell>
  );
}

function VolatilityCard({
  data,
  error,
}: {
  data: MarketIntelData | null;
  error: string;
}) {
  const colorMap = {
    Low: "text-[var(--badge-green-text)]",
    Medium: "text-orange-400",
    High: "text-[var(--badge-red-text)]",
  };

  return (
    <CardShell label="Volatility" error={error}>
      {!data ? (
        <span className="text-[var(--text-muted)] text-sm">Menghitung...</span>
      ) : (
        <>
          <span
            className={`text-2xl font-semibold ${
              colorMap[data.volatility.level]
            }`}
          >
            {data.volatility.level}
          </span>
          <div className="mt-2 text-xs text-[var(--text-muted)]">
            ATR (1H):{" "}
            <span className="text-[var(--text-secondary)]">
              {data.volatility.atrPercent}%
            </span>
          </div>
        </>
      )}
    </CardShell>
  );
}

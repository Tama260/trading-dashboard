"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

type BacktestResult = {
  totalTrades: number;
  wins: number;
  losses: number;
  timeouts: number;
  winRate: number;
  avgR: number;
  totalR: number;
  equityCurve: { index: number; cumulativeR: number }[];
  recentTrades: {
    entryTime: number;
    direction: "long" | "short";
    outcome: "tp1" | "tp2" | "sl" | "timeout";
    rMultiple: number;
  }[];
  candleCount: number;
};

const OUTCOME_LABEL: Record<string, string> = {
  tp1: "TP1",
  tp2: "TP2",
  sl: "SL",
  timeout: "Timeout",
};

export default function BacktestPanel({
  symbol,
  category,
  market,
  interval,
  tradingStyle,
}: {
  symbol: string;
  category: string;
  market: string;
  interval: string;
  tradingStyle: string;
}) {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function runBacktest() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/backtest?symbol=${encodeURIComponent(symbol)}&category=${category}&market=${market}&interval=${interval}&style=${tradingStyle}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Gagal menjalankan backtest");
        setResult(null);
      } else {
        setResult(json);
      }
    } catch {
      setError("Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] p-4">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!result && !open) runBacktest();
        }}
        className="w-full flex items-center justify-between text-xs uppercase tracking-wide text-[var(--text-muted)]"
      >
        <span>🧪 Backtesting — simulasi sinyal ini di data historis</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={runBacktest}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-md bg-[var(--badge-sky-bg)] text-[var(--badge-sky-text)] disabled:opacity-50"
            >
              {loading ? "Menjalankan..." : result ? "🔄 Jalankan Ulang" : "▶ Jalankan Backtest"}
            </button>
            {result && (
              <span className="text-[11px] text-[var(--text-faint)]">
                Berdasarkan {result.candleCount} candle historis
              </span>
            )}
          </div>

          {error && <div className="text-xs text-[var(--text-faint)] py-2">{error}</div>}

          {loading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-8 rounded animate-pulse"
                  style={{ background: "var(--border-card-strong)" }}
                />
              ))}
            </div>
          )}

          {result && !loading && (
            <>
              {result.totalTrades === 0 ? (
                <div className="text-xs text-[var(--text-faint)] py-3">
                  Gak ada sinyal breakout yang terdeteksi di data historis ini
                  buat gaya trading &quot;{tradingStyle}&quot;. Coba timeframe atau
                  gaya trading lain.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                    <div className="p-2.5 rounded-lg bg-[var(--bg-card-secondary)]/40">
                      <div className="text-[var(--text-faint)]">Total Sinyal</div>
                      <div className="text-[var(--text-primary)] font-semibold text-sm">
                        {result.totalTrades}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[var(--bg-card-secondary)]/40">
                      <div className="text-[var(--text-faint)]">Win Rate</div>
                      <div
                        className="font-semibold text-sm"
                        style={{ color: result.winRate >= 50 ? "#22c55e" : "#ef4444" }}
                      >
                        {result.winRate}%
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[var(--bg-card-secondary)]/40">
                      <div className="text-[var(--text-faint)]">Avg R</div>
                      <div
                        className="font-semibold text-sm"
                        style={{ color: result.avgR >= 0 ? "#22c55e" : "#ef4444" }}
                      >
                        {result.avgR >= 0 ? "+" : ""}
                        {result.avgR}R
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[var(--bg-card-secondary)]/40">
                      <div className="text-[var(--text-faint)]">Total R</div>
                      <div
                        className="font-semibold text-sm"
                        style={{ color: result.totalR >= 0 ? "#22c55e" : "#ef4444" }}
                      >
                        {result.totalR >= 0 ? "+" : ""}
                        {result.totalR}R
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-[var(--text-faint)] mb-3">
                    {result.wins} win · {result.losses} loss · {result.timeouts} timeout
                  </div>

                  {result.equityCurve.length > 1 && (
                    <div style={{ width: "100%", height: 160 }} className="mb-4">
                      <ResponsiveContainer>
                        <LineChart data={result.equityCurve}>
                          <XAxis dataKey="index" hide />
                          <YAxis tick={{ fontSize: 10, fill: "var(--text-faint)" }} width={35} />
                          <ReferenceLine y={0} stroke="var(--border-card-strong)" />
                          <Tooltip
                            formatter={(v) => [`${v}R`, "Kumulatif"]}
                            labelFormatter={(l) => `Trade #${Number(l) + 1}`}
                            contentStyle={{
                              background: "var(--bg-card)",
                              border: "1px solid var(--border-card)",
                              fontSize: 11,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="cumulativeR"
                            stroke={result.totalR >= 0 ? "#22c55e" : "#ef4444"}
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <details className="text-xs">
                    <summary className="cursor-pointer text-[var(--text-muted)]">
                      Riwayat {result.recentTrades.length} sinyal terakhir
                    </summary>
                    <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                      {result.recentTrades.map((t, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-2 py-1.5 rounded bg-[var(--bg-card-secondary)]/30"
                        >
                          <span className="text-[var(--text-tertiary)]">
                            {new Date(t.entryTime * 1000).toLocaleDateString("id-ID")} ·{" "}
                            {t.direction === "long" ? "Long" : "Short"}
                          </span>
                          <span className="text-[var(--text-faint)]">{OUTCOME_LABEL[t.outcome]}</span>
                          <span style={{ color: t.rMultiple >= 0 ? "#22c55e" : "#ef4444" }}>
                            {t.rMultiple >= 0 ? "+" : ""}
                            {t.rMultiple}R
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </>
              )}
            </>
          )}

          <p className="text-[10px] text-[var(--text-faint)] mt-3 leading-relaxed">
            ⚠️ Simulasi disederhanakan: TP1 dianggap exit penuh (bukan partial),
            SL menang kalau SL &amp; TP kesentuh di candle sama (asumsi
            pesimis), gak menghitung fee/funding/slippage. Angka di atas
            gambaran kasar, bukan jaminan performa ke depan.
          </p>
        </div>
      )}
    </div>
  );
}

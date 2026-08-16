"use client";

import { useEffect, useState, useCallback } from "react";
import { formatPrice } from "@/lib/format";
import { loadAllWatchlistEntries, WatchlistEntry } from "@/lib/watchlistStorage";

type ScanCategory = "crypto" | "saham" | "forex" | "emas";

type ScanTarget = WatchlistEntry;

type ScanResult = ScanTarget & {
  status: "loading" | "ok" | "error";
  bias?: "Bullish" | "Bearish" | "Neutral";
  confidence?: number;
  regime?: "Trending" | "Ranging";
  breakoutSetup?: boolean;
  entryLow?: number;
  entryHigh?: number;
  stopLoss?: number;
  tp1?: number;
  tp2?: number;
  error?: string;
};

const REFRESH_MS = 60000; // scan semua symbol tiap 60 detik — cukup buat overview, gak perlu se-realtime panel detail

async function scanOne(target: ScanTarget): Promise<ScanResult> {
  const url =
    target.category === "crypto"
      ? `/api/setup?symbol=${target.symbol}&interval=1h&market=${target.market}`
      : `/api/stock-setup?symbol=${encodeURIComponent(target.symbol)}&market=${target.market}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      return { ...target, status: "error", error: json.error ?? "Gagal" };
    }
    return {
      ...target,
      status: "ok",
      bias: json.bias,
      confidence: json.confidence,
      regime: json.regime,
      breakoutSetup: json.breakoutSetup,
      entryLow: json.levels.entryLow,
      entryHigh: json.levels.entryHigh,
      stopLoss: json.levels.stopLoss,
      tp1: json.levels.tp1,
      tp2: json.levels.tp2,
    };
  } catch {
    return { ...target, status: "error", error: "Gagal konek" };
  }
}

// Warna sel berdasarkan bias + confidence — makin tinggi confidence makin
// pekat warnanya, jadi mata langsung ketarik ke sinyal yang paling kuat
// tanpa perlu baca angka satu-satu.
function cellStyle(result: ScanResult): { bg: string; border: string; text: string } {
  if (result.status === "error") {
    return { bg: "transparent", border: "var(--border-card)", text: "var(--text-faint)" };
  }
  if (result.status === "loading" || !result.bias) {
    return { bg: "var(--bg-card)", border: "var(--border-card)", text: "var(--text-faint)" };
  }

  const c = result.confidence ?? 0;
  const intensity = c >= 70 ? 0.35 : c >= 50 ? 0.2 : 0.1;

  if (result.bias === "Bullish") {
    return { bg: `rgba(34,197,94,${intensity})`, border: "#22c55e", text: "#22c55e" };
  }
  if (result.bias === "Bearish") {
    return { bg: `rgba(239,68,68,${intensity})`, border: "#ef4444", text: "#ef4444" };
  }
  return { bg: "var(--bg-card)", border: "var(--border-card)", text: "var(--text-tertiary)" };
}

export default function MarketScanner() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // CommandPalette (Cmd/Ctrl+K) mengirim event ini kalau user pilih symbol
  // dari situ — scanner-nya udah punya UI expand-detail, tinggal dipicu
  // dari luar tanpa perlu bikin komponen detail terpisah lagi
  useEffect(() => {
    function handleExpandRequest(e: Event) {
      const detail = (e as CustomEvent<{ symbol: string; market: string }>).detail;
      if (!detail) return;
      const key = `${detail.symbol}|${detail.market}`;
      setExpandedKey(key);
      document.getElementById(`scanner-cell-${key}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
    window.addEventListener("scanner:expand", handleExpandRequest);
    return () => window.removeEventListener("scanner:expand", handleExpandRequest);
  }, []);
  const [lastScanAt, setLastScanAt] = useState<Date | null>(null);

  const runScan = useCallback(async () => {
    const targets = loadAllWatchlistEntries();
    if (targets.length === 0) return;

    setScanning(true);
    // Tampilin state loading dulu buat semua target, biar grid-nya langsung
    // muncul utuh (skeleton), bukan nunggu SEMUA fetch selesai baru render
    setResults((prev) =>
      targets.map((t) => {
        const existing = prev.find((p) => p.symbol === t.symbol && p.market === t.market);
        return existing ? { ...existing, status: "loading" } : { ...t, status: "loading" };
      })
    );

    const settled = await Promise.allSettled(targets.map(scanOne));
    const next = settled.map((s, i) =>
      s.status === "fulfilled" ? s.value : { ...targets[i], status: "error" as const, error: "Gagal" }
    );

    setResults(next);
    setScanning(false);
    setLastScanAt(new Date());
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Sengaja lewat microtask dulu sebelum manggil runScan() (yang di
    // dalamnya langsung setState buat nampilin skeleton loading) — biar
    // gak kena aturan lint "no synchronous setState in effect body"
    Promise.resolve().then(() => {
      if (!cancelled) runScan();
    });
    const timer = setInterval(runScan, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [runScan]);

  const categoryOrder: ScanCategory[] = ["crypto", "saham", "forex", "emas"];
  const categoryLabel: Record<ScanCategory, string> = {
    crypto: "Crypto (Spot)",
    saham: "Saham",
    forex: "Forex",
    emas: "Emas",
  };

  if (results.length === 0 && !scanning) return null;

  return (
    <section className="mb-8" id="market-scanner">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
            🔥 Market Scanner
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
            Scan cepat seluruh watchlist kamu. Klik sel buat lihat detail entry/SL/TP.
            {lastScanAt && ` Update terakhir: ${lastScanAt.toLocaleTimeString("id-ID")}.`}
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="text-xs px-3 py-1.5 rounded-md border disabled:opacity-50"
          style={{ borderColor: "var(--border-card-strong)", color: "var(--text-tertiary)" }}
        >
          {scanning ? "Scanning..." : "🔄 Refresh"}
        </button>
      </div>

      <div
        className="rounded-xl p-4"
        style={{ border: "1px solid var(--border-card)", background: "var(--bg-card)" }}
      >
        {categoryOrder.map((cat) => {
          const items = results.filter((r) => r.category === cat);
          if (items.length === 0) return null;

          return (
            <div key={cat} className="mb-4 last:mb-0">
              <div className="text-[10px] uppercase tracking-wide mb-2" style={{ color: "var(--text-faint)" }}>
                {categoryLabel[cat]}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {items.map((r) => {
                  const key = `${r.symbol}|${r.market}`;
                  const style = cellStyle(r);
                  const expanded = expandedKey === key;
                  return (
                    <div key={key} id={`scanner-cell-${key}`} className={expanded ? "col-span-2 sm:col-span-3 md:col-span-6" : ""}>
                      <button
                        onClick={() => setExpandedKey(expanded ? null : key)}
                        className="w-full text-left rounded-lg px-3 py-2.5 transition-colors"
                        style={{
                          background: style.bg,
                          border: `1px solid ${style.border}`,
                        }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                            {r.label}
                          </span>
                          {r.breakoutSetup && <span title="Breakout Setup">🔥</span>}
                          {r.regime === "Ranging" && <span title="Ranging">📊</span>}
                        </div>
                        {r.status === "ok" && (
                          <div
                            className="text-[11px] mt-1 transition-opacity duration-300"
                            style={{ color: style.text }}
                          >
                            {r.bias} · {r.confidence}%
                          </div>
                        )}
                        {r.status === "loading" && (
                          <div
                            className="h-3 w-16 rounded mt-1.5 animate-pulse"
                            style={{ background: "var(--border-card-strong)" }}
                          />
                        )}
                        {r.status === "error" && (
                          <div className="text-[11px] mt-1" style={{ color: "var(--text-faint)" }}>
                            Error
                          </div>
                        )}
                      </button>

                      {expanded && r.status === "ok" && (
                        <div
                          className="mt-2 rounded-lg p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3"
                          style={{ border: "1px solid var(--border-card)", background: "var(--bg-page)" }}
                        >
                          <div>
                            <div style={{ color: "var(--text-faint)" }}>Entry Zone</div>
                            <div style={{ color: "var(--text-secondary)" }}>
                              {formatPrice(r.entryLow ?? 0)} - {formatPrice(r.entryHigh ?? 0)}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: "var(--text-faint)" }}>Stop Loss</div>
                            <div style={{ color: "#ef4444" }}>{formatPrice(r.stopLoss ?? 0)}</div>
                          </div>
                          <div>
                            <div style={{ color: "var(--text-faint)" }}>TP1</div>
                            <div style={{ color: "#22c55e" }}>{formatPrice(r.tp1 ?? 0)}</div>
                          </div>
                          <div>
                            <div style={{ color: "var(--text-faint)" }}>TP2</div>
                            <div style={{ color: "#22c55e" }}>{formatPrice(r.tp2 ?? 0)}</div>
                          </div>
                        </div>
                      )}
                      {expanded && r.status === "error" && (
                        <div
                          className="mt-2 rounded-lg p-3 text-xs"
                          style={{ border: "1px solid var(--border-card)", color: "var(--text-faint)" }}
                        >
                          {r.error}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

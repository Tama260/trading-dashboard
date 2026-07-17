"use client";

import { useEffect, useState } from "react";
import DrawableChart, { Annotation } from "./DrawableChart";
import { formatPrice } from "@/lib/format";
import AIChat from "./AIChat";

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

type StructureLabel = {
  time: number;
  price: number;
  tag: "H" | "L" | "HH" | "LH" | "HL" | "LL";
  event?: "BOS" | "CHoCH";
};

type LiquidityLevel = {
  price: number;
  type: "buy-side" | "sell-side";
  touches: number;
};

type LiquiditySweep = {
  time: number;
  price: number;
  type: "buy-side" | "sell-side";
  direction: "bullish" | "bearish";
};

type FairValueGap = {
  startTime: number;
  endTime: number;
  displayEndTime: number;
  top: number;
  bottom: number;
  type: "bullish" | "bearish";
  filled: boolean;
};

type OrderBlock = {
  time: number;
  endTime: number;
  high: number;
  low: number;
  type: "bullish" | "bearish";
};

type StructureResult = {
  structure: StructureLabel[];
  liquidity: LiquidityLevel[];
  sweeps: LiquiditySweep[];
  fvg: FairValueGap[];
  orderBlocks: OrderBlock[];
};

type LevelKey =
  | "resistance"
  | "support"
  | "entryZone"
  | "sl"
  | "tp1"
  | "tp2"
  | "structure"
  | "liquidity"
  | "sweep"
  | "fvg"
  | "orderBlock";

const POLL_INTERVAL_MS = 30000; // level setup tidak perlu se-realtime harga

export default function TradeSetupPanel({
  symbol,
  interval = "1h",
}: {
  symbol: string;
  interval?: string;
}) {
  const [data, setData] = useState<SetupResult | null>(null);
  const [structureData, setStructureData] = useState<StructureResult | null>(
    null
  );
  const [error, setError] = useState("");

  // Kontrol per-garis — default: level actionable (entry/SL/TP) tampil,
  // resistance/support & structure/liquidity dimatikan biar chart bersih
  // di awal, tinggal dicentang kalau mau lihat lebih detail
  const [visible, setVisible] = useState<Record<LevelKey, boolean>>({
    resistance: false,
    support: false,
    entryZone: true,
    sl: true,
    tp1: true,
    tp2: true,
    structure: false,
    liquidity: false,
    sweep: false,
    fvg: false,
    orderBlock: false,
  });

  function toggle(key: LevelKey) {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function load() {
      try {
        const [setupRes, structureRes] = await Promise.all([
          fetch(`/api/setup?symbol=${symbol}&interval=${interval}`, {
            cache: "no-store",
          }),
          fetch(`/api/structure?symbol=${symbol}&interval=${interval}`, {
            cache: "no-store",
          }),
        ]);

        const setupJson = await setupRes.json();
        if (!setupRes.ok)
          throw new Error(setupJson.error || "Gagal memuat setup");

        // Structure bersifat opsional — kalau gagal, jangan gagalkan
        // seluruh panel, cukup skip anotasi structure-nya saja
        const structureJson = structureRes.ok
          ? await structureRes.json()
          : null;

        if (!cancelled) {
          setData(setupJson);
          setStructureData(structureJson);
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

  const setupAnnotations: Annotation[] = data
    ? [
        ...(visible.resistance
          ? [
              {
                type: "hline" as const,
                price: data.levels.resistance,
                label: "Resistance",
                color: "#f97316",
              },
            ]
          : []),
        ...(visible.support
          ? [
              {
                type: "hline" as const,
                price: data.levels.support,
                label: "Support",
                color: "#f97316",
              },
            ]
          : []),
        ...(visible.entryZone
          ? [
              {
                type: "zone" as const,
                priceLow: data.levels.entryLow,
                priceHigh: data.levels.entryHigh,
                label: "Entry Zone",
                color: "#38bdf8",
              },
            ]
          : []),
        ...(visible.sl
          ? [
              {
                type: "hline" as const,
                price: data.levels.stopLoss,
                label: "SL",
                color: "#ef4444",
              },
            ]
          : []),
        ...(visible.tp1
          ? [
              {
                type: "hline" as const,
                price: data.levels.tp1,
                label: "TP1",
                color: "#22c55e",
              },
            ]
          : []),
        ...(visible.tp2
          ? [
              {
                type: "hline" as const,
                price: data.levels.tp2,
                label: "TP2",
                color: "#22c55e",
              },
            ]
          : []),
      ]
    : [];

  // Batasi label structure ke 8 pivot paling baru — struktur lama biasanya
  // sudah tidak relevan secara praktis dan bikin chart penuh sesak
  const recentStructure = (structureData?.structure ?? []).slice(-8);

  const structureAnnotations: Annotation[] = recentStructure.map((s) => ({
    type: "label",
    time: s.time,
    price: s.price,
    text: s.event ? `${s.tag} ${s.event}` : s.tag,
    color:
      s.event === "CHoCH"
        ? "#facc15"
        : s.event === "BOS"
        ? "#a855f7"
        : "#737373",
  }));

  // Terlalu banyak liquidity pool bikin chart penuh garis. Batasi hanya
  // yang PALING DEKAT dengan harga saat ini — itu yang paling relevan
  // secara praktis (liquidity jauh dari harga kurang actionable).
  const currentPrice = data?.levels
    ? (data.levels.resistance + data.levels.support) / 2
    : null;

  const nearestLiquidity = currentPrice
    ? [...(structureData?.liquidity ?? [])]
        .sort(
          (a, b) =>
            Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice)
        )
        .slice(0, 3)
    : (structureData?.liquidity ?? []).slice(0, 3);

  // Liquidity pool digambar sebagai garis putus-putus ungu muda, beda warna
  // dari level resistance/support supaya tidak tertukar
  const liquidityAnnotations: Annotation[] = nearestLiquidity.map((l) => ({
    type: "hline",
    price: l.price,
    label: `${l.type === "buy-side" ? "EQH" : "EQL"} (${l.touches}x)`,
    color: "#c084fc",
  }));

  // Sweep: tandai dengan label kecil di titik sweep-nya. Batasi ke 5
  // terbaru biar tidak menumpuk kalau riwayatnya panjang.
  const sweepAnnotations: Annotation[] = (structureData?.sweeps ?? [])
    .slice(-5)
    .map((s) => ({
      type: "label",
      time: s.time,
      price: s.price,
      text: "SWEEP",
      color: s.direction === "bullish" ? "#22c55e" : "#ef4444",
    }));

  // FVG: kotak dibatasi waktu (bukan selebar layar). Yang belum terisi
  // (filled: false) lebih relevan, jadi diprioritaskan; kotak yang sudah
  // terisi digambar putus-putus supaya kelihatan "sudah tidak aktif"
  const fvgAnnotations: Annotation[] = (structureData?.fvg ?? [])
    .slice(-6)
    .map((f) => ({
      type: "box",
      time1: f.startTime,
      time2: f.displayEndTime,
      priceLow: f.bottom,
      priceHigh: f.top,
      label: `FVG${f.filled ? " (filled)" : ""}`,
      color: f.type === "bullish" ? "#22c55e" : "#ef4444",
      dashed: f.filled,
    }));

  // Order Block: kotak dari candle OB sampai waktu terakhir data
  const orderBlockAnnotations: Annotation[] = (
    structureData?.orderBlocks ?? []
  )
    .slice(-4)
    .map((ob) => ({
      type: "box",
      time1: ob.time,
      time2: ob.endTime,
      priceLow: ob.low,
      priceHigh: ob.high,
      label: `OB ${ob.type === "bullish" ? "Bullish" : "Bearish"}`,
      color: ob.type === "bullish" ? "#38bdf8" : "#f97316",
    }));

  const annotations = [
    ...setupAnnotations,
    ...(visible.structure ? structureAnnotations : []),
    ...(visible.liquidity ? liquidityAnnotations : []),
    ...(visible.sweep ? sweepAnnotations : []),
    ...(visible.fvg ? fvgAnnotations : []),
    ...(visible.orderBlock ? orderBlockAnnotations : []),
  ];

  const biasColor =
    data?.bias === "Bullish"
      ? "text-[var(--badge-green-text)]"
      : data?.bias === "Bearish"
      ? "text-[var(--badge-red-text)]"
      : "text-orange-400";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
            Setup Detection — {symbol} ({interval})
          </span>
          {data && (
            <span className="text-xs text-[var(--text-muted)]">
              Confidence:{" "}
              <span className="text-[var(--text-secondary)]">{data.confidence}%</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <LevelChip
            label="Resistance"
            color="#f97316"
            active={visible.resistance}
            onClick={() => toggle("resistance")}
          />
          <LevelChip
            label="Support"
            color="#f97316"
            active={visible.support}
            onClick={() => toggle("support")}
          />
          <LevelChip
            label="Entry Zone"
            color="#38bdf8"
            active={visible.entryZone}
            onClick={() => toggle("entryZone")}
          />
          <LevelChip
            label="Stop Loss"
            color="#ef4444"
            active={visible.sl}
            onClick={() => toggle("sl")}
          />
          <LevelChip
            label="TP1"
            color="#22c55e"
            active={visible.tp1}
            onClick={() => toggle("tp1")}
          />
          <LevelChip
            label="TP2"
            color="#22c55e"
            active={visible.tp2}
            onClick={() => toggle("tp2")}
          />
          <span className="w-px bg-[var(--bg-card-secondary)] mx-1" />
          <LevelChip
            label="Structure (HH/HL/LH/LL)"
            color="#a855f7"
            active={visible.structure}
            onClick={() => toggle("structure")}
          />
          <LevelChip
            label="Liquidity Pool"
            color="#c084fc"
            active={visible.liquidity}
            onClick={() => toggle("liquidity")}
          />
          <LevelChip
            label="Liquidity Sweep"
            color="#facc15"
            active={visible.sweep}
            onClick={() => toggle("sweep")}
          />
          <LevelChip
            label="Fair Value Gap"
            color="#22c55e"
            active={visible.fvg}
            onClick={() => toggle("fvg")}
          />
          <LevelChip
            label="Order Block"
            color="#38bdf8"
            active={visible.orderBlock}
            onClick={() => toggle("orderBlock")}
          />
        </div>

        {error && <div className="text-sm text-[var(--badge-red-text)]">{error}</div>}
        {!data && !error && (
          <div className="text-sm text-[var(--text-muted)]">Menganalisis...</div>
        )}

        {data && (
          <>
            <div className={`text-2xl font-semibold mb-3 ${biasColor}`}>
              {data.bias}{" "}
              {data.breakout && (
                <span className="text-sm text-[var(--text-tertiary)] font-normal">
                  (Breakout Terkonfirmasi)
                </span>
              )}
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4">
              {data.checklist.map((item, i) => (
                <li
                  key={i}
                  className={`text-xs flex items-center gap-2 ${
                    item.passed ? "text-[var(--text-secondary)]" : "text-[var(--text-faint)]"
                  }`}
                >
                  <span>{item.passed ? "✓" : "✗"}</span> {item.label}
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
              <LevelBox
                label="Entry Zone"
                value={`${formatPrice(data.levels.entryLow)} - ${formatPrice(
                  data.levels.entryHigh
                )}`}
                color="text-[var(--badge-sky-text)]"
              />
              <LevelBox
                label="Stop Loss"
                value={formatPrice(data.levels.stopLoss)}
                color="text-[var(--badge-red-text)]"
              />
              <LevelBox
                label="TP1"
                value={formatPrice(data.levels.tp1)}
                color="text-[var(--badge-green-text)]"
              />
              <LevelBox
                label="TP2"
                value={formatPrice(data.levels.tp2)}
                color="text-[var(--badge-green-text)]"
              />
            </div>

            {structureData && (
              <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)] border-t border-[var(--border-card)] pt-3">
                <span>
                  Liquidity Pool:{" "}
                  <span className="text-purple-400">
                    {structureData.liquidity.length} terdeteksi
                  </span>
                </span>
                {(() => {
                  const lastEvent = [...structureData.structure]
                    .reverse()
                    .find((s) => s.event);
                  return lastEvent ? (
                    <span>
                      Structure Event Terakhir:{" "}
                      <span
                        className={
                          lastEvent.event === "CHoCH"
                            ? "text-[var(--badge-yellow-text)]"
                            : "text-purple-400"
                        }
                      >
                        {lastEvent.tag} {lastEvent.event}
                      </span>
                    </span>
                  ) : null;
                })()}
              </div>
            )}
          </>
        )}
      </div>

      <DrawableChart symbol={symbol} interval={interval} annotations={annotations} />

      <AIChat
        context={
          data
            ? {
                symbol,
                bias: data.bias,
                confidence: data.confidence,
                entryLow: data.levels.entryLow,
                entryHigh: data.levels.entryHigh,
                stopLoss: data.levels.stopLoss,
                tp1: data.levels.tp1,
                tp2: data.levels.tp2,
              }
            : undefined
        }
      />
    </div>
  );
}

function LevelChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors"
      style={
        active
          ? {
              backgroundColor: `${color}1a`,
              borderColor: `${color}66`,
              color,
            }
          : {
              backgroundColor: "transparent",
              borderColor: "#404040",
              color: "#737373",
            }
      }
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: active ? color : "#525252" }}
      />
      {label}
    </button>
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
    <div className="rounded-lg bg-[var(--bg-card-secondary)]/50 p-3">
      <div className="text-[var(--text-muted)] mb-1">{label}</div>
      <div className={`font-semibold ${color}`}>{value}</div>
    </div>
  );
}

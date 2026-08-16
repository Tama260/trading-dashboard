"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";

const STORAGE_KEY = "trading-dashboard-position-sizing";

type SizingSettings = {
  balance: string;
  riskPercent: string;
  leverage: string;
};

const DEFAULT_SETTINGS: SizingSettings = {
  balance: "",
  riskPercent: "1",
  leverage: "1",
};

function loadSettings(): SizingSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function PositionSizeCalculator({
  entryLow,
  entryHigh,
  stopLoss,
}: {
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
}) {
  const [settings, setSettings] = useState<SizingSettings>(DEFAULT_SETTINGS);
  const [open, setOpen] = useState(false);

  // Lazy-load dari localStorage lewat useState initializer form kedua
  // (bukan effect) — hindari rule "set-state-in-effect"
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setSettings(loadSettings());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateSetting<K extends keyof SizingSettings>(key: K, value: string) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage penuh/diblokir — tidak fatal, cukup gak ke-save
    }
  }

  const entryPrice = (entryLow + entryHigh) / 2;
  const riskPerUnit = Math.abs(entryPrice - stopLoss);

  const balance = parseFloat(settings.balance);
  const riskPercent = parseFloat(settings.riskPercent);
  const leverage = Math.max(1, parseFloat(settings.leverage) || 1);

  const valid = balance > 0 && riskPercent > 0 && riskPerUnit > 0;

  const riskAmount = valid ? balance * (riskPercent / 100) : 0;
  const positionSize = valid ? riskAmount / riskPerUnit : 0;
  const positionValue = positionSize * entryPrice;
  const requiredMargin = positionValue / leverage;

  return (
    <div className="mt-4 rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-xs uppercase tracking-wide text-[var(--text-muted)]"
      >
        <span>🧮 Position Sizing Calculator</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-[10px] text-[var(--text-faint)] block mb-1">
                Modal (USD/Rp)
              </label>
              <input
                type="number"
                step="any"
                value={settings.balance}
                onChange={(e) => updateSetting("balance", e.target.value)}
                placeholder="1000"
                className="w-full bg-[var(--bg-card-secondary)] border border-[var(--border-card-strong)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-faint)] block mb-1">
                Risk per trade (%)
              </label>
              <input
                type="number"
                step="any"
                value={settings.riskPercent}
                onChange={(e) => updateSetting("riskPercent", e.target.value)}
                className="w-full bg-[var(--bg-card-secondary)] border border-[var(--border-card-strong)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-faint)] block mb-1">
                Leverage (opsional)
              </label>
              <input
                type="number"
                step="any"
                value={settings.leverage}
                onChange={(e) => updateSetting("leverage", e.target.value)}
                className="w-full bg-[var(--bg-card-secondary)] border border-[var(--border-card-strong)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
              />
            </div>
          </div>

          {!valid ? (
            <p className="text-xs text-[var(--text-faint)]">
              Isi modal buat lihat rekomendasi ukuran posisi — dihitung
              otomatis dari Entry Zone &amp; Stop Loss di atas.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-[var(--bg-card-secondary)]/40">
                  <div className="text-[var(--text-faint)]">Risk Amount</div>
                  <div className="text-[var(--text-primary)] font-semibold text-sm">
                    {riskAmount.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--bg-card-secondary)]/40">
                  <div className="text-[var(--text-faint)]">Ukuran Posisi</div>
                  <div className="text-[var(--text-primary)] font-semibold text-sm">
                    {positionSize.toLocaleString("id-ID", { maximumFractionDigits: 6 })}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--bg-card-secondary)]/40">
                  <div className="text-[var(--text-faint)]">Nilai Posisi</div>
                  <div className="text-[var(--text-primary)] font-semibold text-sm">
                    {positionValue.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--bg-card-secondary)]/40">
                  <div className="text-[var(--text-faint)]">Margin Dibutuhkan</div>
                  <div className="text-[var(--text-primary)] font-semibold text-sm">
                    {requiredMargin.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-[var(--text-faint)] mt-3">
                Kalau harga kena Stop Loss ({formatPrice(stopLoss)}), maksimal
                rugi kamu {riskAmount.toLocaleString("id-ID", { maximumFractionDigits: 2 })}{" "}
                ({settings.riskPercent}% dari modal) — asalkan size posisi
                sesuai angka di atas, bukan asal pasang.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

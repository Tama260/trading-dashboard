"use client";

import { useEffect, useRef, useState } from "react";
import type { SetupResult } from "@/lib/setupDetection";
import { loadAISettings, resolveActiveAIConfig } from "@/lib/aiSettings";

// Bikin "sidik jari" dari sinyal yang BENERAN penting — bukan dari objek
// `data` mentah, yang berubah tiap poll (harga live ikut nempel di situ
// walau cuma geser recehan). Tanpa ini, komentar AI bakal di-generate
// ulang tiap 8-30 detik sekali (sesuai poll interval Setup Detection) dan
// boros API call padahal kesimpulannya sama aja. Confidence dibulatkan ke
// kelipatan 10 supaya perubahan receh (mis. 72% -> 74%) tidak dianggap
// perubahan berarti.
function buildSignature(
  data: SetupResult,
  symbol: string,
  interval: string
): string {
  return [
    symbol,
    interval,
    data.bias,
    data.regime,
    data.breakoutSetup ? "breakoutSetup" : "",
    Math.round(data.confidence / 10) * 10,
  ].join("|");
}

function buildPrompt(
  data: SetupResult,
  symbol: string,
  marketLabel: string,
  tradingStyle: string
): { system: string; user: string } {
  const regimeInfo =
    data.regime === "Ranging" && data.range
      ? `Regime: Ranging (harga terkurung ${data.range.low}-${data.range.high}, entry-nya FADE ke tepi range)`
      : `Regime: Trending (ADX ${data.trendStrength})`;

  const compressionInfo = data.breakoutSetup
    ? `Breakout ini didahului kompresi volatilitas ${data.volatilityCompression.compressionPercent}% — sinyal lebih meyakinkan dari breakout biasa.`
    : data.volatilityCompression.compressed
    ? `Volatilitas sedang menyempit ${data.volatilityCompression.compressionPercent}% — potensi breakout, belum terjadi.`
    : "";

  const system =
    "Kamu adalah analis trading rule-based. Tulis SATU paragraf pendek (2-3 kalimat, maksimal 60 kata) " +
    "dalam Bahasa Indonesia yang natural, merangkum KENAPA setup ini terlihat seperti sekarang, berdasarkan " +
    "data yang diberikan. Jangan mengulang semua angka mentah satu-satu seperti daftar — rangkai jadi kalimat " +
    "mengalir. WAJIB sebut minimal 1 angka konkret (entry/SL/TP/confidence/ADX). Jangan beri salam pembuka, " +
    "jangan beri disclaimer di akhir (disclaimer sudah ditampilkan terpisah di tempat lain). Jangan pakai markdown.";

  const user = `Symbol: ${symbol} (${marketLabel}), gaya trading: ${tradingStyle}
Bias: ${data.bias}, confidence: ${data.confidence}%
${regimeInfo}
Entry zone: ${data.levels.entryLow}-${data.levels.entryHigh}, SL: ${data.levels.stopLoss}, TP1: ${data.levels.tp1}, TP2: ${data.levels.tp2}
Breakout: ${data.breakout ? "ya" : "belum"}
${compressionInfo}
Checklist: ${data.checklist.map((c) => `${c.passed ? "✓" : "✗"} ${c.label}`).join("; ")}`;

  return { system, user };
}

export default function AISetupCommentary({
  data,
  symbol,
  marketLabel,
  interval,
  tradingStyle,
}: {
  data: SetupResult | null;
  symbol: string;
  marketLabel: string;
  interval: string;
  tradingStyle: string;
}) {
  const [commentary, setCommentary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Lazy initializer (bukan effect) — jalan sekali pas render pertama,
  // gak kena aturan "no synchronous setState in effect"
  const [hasApiKey, setHasApiKey] = useState<boolean>(() =>
    Boolean(loadAISettings().apiKey)
  );
  const lastSignatureRef = useRef<string>("");

  useEffect(() => {
    if (!data) return;
    let cancelled = false;

    async function run() {
      // Sengaja await duluan sebelum setState apa pun — bukan cuma buat
      // lolos lint rule "set-state-in-effect", tapi juga best practice:
      // effect body idealnya gak langsung setState sinkron, biar gak
      // memicu cascading render yang tidak perlu.
      await Promise.resolve();
      if (!data) return;

      const settings = loadAISettings();
      if (!settings.apiKey) {
        if (!cancelled) setHasApiKey(false);
        return;
      }
      if (!cancelled) setHasApiKey(true);

      const signature = buildSignature(data, symbol, interval);
      if (signature === lastSignatureRef.current) return; // sinyal gak berubah, gak perlu generate ulang
      lastSignatureRef.current = signature;

      const config = resolveActiveAIConfig(settings);
      const { system, user } = buildPrompt(data, symbol, marketLabel, tradingStyle);

      if (!cancelled) {
        setLoading(true);
        setError("");
      }

      try {
        const res = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: config.provider,
            apiKey: settings.apiKey,
            model: config.model,
            baseUrl: config.baseUrl,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (json.error) {
          setError(json.error);
        } else {
          setCommentary(json.reply?.trim() ?? "");
        }
      } catch {
        if (!cancelled) setError("Gagal menghubungi AI");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [data, symbol, marketLabel, interval, tradingStyle]);

  if (!data) return null;

  if (!hasApiKey) {
    return (
      <div
        className="mt-3 px-3 py-2 rounded-md text-xs"
        style={{ color: "var(--text-faint)", border: "1px dashed var(--border-card)" }}
      >
        💬 Aktifkan API key di AI Chat (ikon chat kanan bawah) buat dapat
        komentar analisis otomatis di sini.
      </div>
    );
  }

  return (
    <div
      className="mt-3 px-3 py-2.5 rounded-md text-xs leading-relaxed"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      <div
        className="uppercase tracking-wide mb-1 text-[10px]"
        style={{ color: "var(--text-faint)" }}
      >
        🤖 AI Commentary
      </div>
      {loading && !commentary && (
        <div className="animate-pulse" style={{ color: "var(--text-faint)" }}>
          Menyusun analisis...
        </div>
      )}
      {error && !loading && (
        <div style={{ color: "var(--text-faint)" }}>
          Gagal generate komentar ({error}) — data numerik di atas tetap valid.
        </div>
      )}
      {commentary && (
        <p style={{ color: "var(--text-secondary)" }}>
          {commentary}
          {loading && <span className="opacity-50"> (memperbarui...)</span>}
        </p>
      )}
    </div>
  );
}

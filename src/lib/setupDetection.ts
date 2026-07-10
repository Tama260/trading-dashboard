import { Kline } from "./binance";
import { atr } from "./indicators";

export type Pivot = {
  index: number;
  time: number;
  price: number;
  type: "high" | "low";
};

// Pivot high: candle yang high-nya lebih tinggi dari N candle di kiri & kanannya.
// Pivot low: kebalikannya. Ini cara standar mendeteksi swing point tanpa ML.
export function findPivots(
  klines: Kline[],
  leftBars = 3,
  rightBars = 3
): Pivot[] {
  const pivots: Pivot[] = [];

  for (let i = leftBars; i < klines.length - rightBars; i++) {
    const window = klines.slice(i - leftBars, i + rightBars + 1);
    const maxHigh = Math.max(...window.map((k) => k.high));
    const minLow = Math.min(...window.map((k) => k.low));

    if (klines[i].high === maxHigh) {
      pivots.push({
        index: i,
        time: klines[i].time,
        price: klines[i].high,
        type: "high",
      });
    }
    if (klines[i].low === minLow) {
      pivots.push({
        index: i,
        time: klines[i].time,
        price: klines[i].low,
        type: "low",
      });
    }
  }

  return pivots;
}

export type Structure = "Bullish" | "Bearish" | "Neutral";

// Bullish: pivot high & pivot low tiga terakhir sama-sama naik (Higher High, Higher Low)
// Bearish: kebalikannya (Lower High, Lower Low)
// Neutral: campur/tidak konsisten
export function detectStructure(pivots: Pivot[]): Structure {
  const highs = pivots.filter((p) => p.type === "high").slice(-3);
  const lows = pivots.filter((p) => p.type === "low").slice(-3);

  const isRising = (arr: Pivot[]) =>
    arr.length >= 2 && arr.every((p, i) => i === 0 || p.price > arr[i - 1].price);
  const isFalling = (arr: Pivot[]) =>
    arr.length >= 2 && arr.every((p, i) => i === 0 || p.price < arr[i - 1].price);

  if (isRising(highs) && isRising(lows)) return "Bullish";
  if (isFalling(highs) && isFalling(lows)) return "Bearish";
  return "Neutral";
}

export type SetupResult = {
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

export function calculateSetup(klines: Kline[]): SetupResult {
  if (klines.length < 30) {
    throw new Error("Data candlestick tidak cukup untuk analisis setup");
  }

  const pivots = findPivots(klines);
  const structure = detectStructure(pivots);
  const lastClose = klines[klines.length - 1].close;
  const lastCandle = klines[klines.length - 1];
  const atrValue = atr(klines, 14);

  const resistancePivots = pivots
    .filter((p) => p.type === "high" && p.price > lastClose)
    .sort((a, b) => a.price - b.price);
  const supportPivots = pivots
    .filter((p) => p.type === "low" && p.price < lastClose)
    .sort((a, b) => b.price - a.price);

  // Kalau tidak ada pivot di atas/bawah harga saat ini (jarang, tapi bisa
  // terjadi di data pendek), pakai high/low tertinggi & terendah sebagai fallback
  // PENTING: fallback ini HARUS mengecualikan candle terakhir. Kalau tidak,
  // saat candle terakhir breakout dan belum ada pivot resistance di atasnya,
  // fallback akan memakai high candle itu sendiri sebagai "resistance" —
  // membuat breakout mustahil terdeteksi (close tidak akan pernah > high
  // dirinya sendiri).
  const priorKlines = klines.slice(0, -1);
  const resistance =
    resistancePivots[0]?.price ??
    Math.max(...priorKlines.slice(-30).map((k) => k.high));
  const support =
    supportPivots[0]?.price ??
    Math.min(...priorKlines.slice(-30).map((k) => k.low));

  // Breakout: candle terakhir close di atas resistance sebelumnya (untuk bias
  // bullish) dengan body candle yang cukup besar dibanding ATR (candle "impulsif")
  const candleBody = Math.abs(lastCandle.close - lastCandle.open);
  const strongBody = candleBody > atrValue * 0.6;

  const priorResistance =
    resistancePivots[1]?.price ?? resistancePivots[0]?.price ?? resistance;
  const priorSupport =
    supportPivots[1]?.price ?? supportPivots[0]?.price ?? support;

  const breakoutUp = lastClose > priorResistance && strongBody;
  const breakoutDown = lastClose < priorSupport && strongBody;
  const breakout = breakoutUp || breakoutDown;

  // Volume confirmation: volume candle terakhir vs rata-rata 20 candle
  const avgVolume =
    klines.slice(-21, -1).reduce((s, k) => s + k.volume, 0) / 20;
  const volumeConfirmed = lastCandle.volume > avgVolume * 1.2;

  let bias: SetupResult["bias"] = structure;
  if (breakoutUp) bias = "Bullish";
  if (breakoutDown) bias = "Bearish";

  // Rule-based confidence scoring, komponen dan bobotnya transparan
  // (mudah dijelaskan, bukan black-box)
  const checklist = [
    { label: "Struktur trend searah bias", passed: structure === bias },
    { label: "Breakout candle impulsif terkonfirmasi", passed: breakout },
    { label: "Volume meningkat saat breakout", passed: volumeConfirmed },
    { label: "Risk/Reward memadai (≥ 1.5R)", passed: true }, // dihitung ulang di bawah
  ];

  let confidence = 30;
  if (structure === bias) confidence += 20;
  if (breakout) confidence += 25;
  if (volumeConfirmed) confidence += 15;

  // Entry zone: area retest di sekitar level yang baru ditembus (atau level
  // support/resistance terdekat kalau belum breakout)
  const pivotForEntry = breakoutUp
    ? priorResistance
    : breakoutDown
    ? priorSupport
    : bias === "Bullish"
    ? support
    : resistance;

  const entryBuffer = atrValue * 0.3;
  const entryLow = pivotForEntry - entryBuffer;
  const entryHigh = pivotForEntry + entryBuffer;

  const stopBuffer = atrValue * 0.8;
  const stopLoss =
    bias === "Bearish"
      ? pivotForEntry + stopBuffer
      : pivotForEntry - stopBuffer;

  const riskDistance = Math.abs(pivotForEntry - stopLoss);
  const rrOk = riskDistance > 0;
  checklist[3].passed = rrOk;
  if (rrOk) confidence += 10;

  const direction = bias === "Bearish" ? -1 : 1;
  const tp1 = pivotForEntry + direction * riskDistance * 1.5;
  const tp2 = pivotForEntry + direction * riskDistance * 3;

  return {
    bias,
    confidence: Math.min(confidence, 95),
    breakout,
    checklist,
    levels: {
      resistance,
      support,
      entryLow: Math.min(entryLow, entryHigh),
      entryHigh: Math.max(entryLow, entryHigh),
      stopLoss,
      tp1,
      tp2,
    },
  };
}

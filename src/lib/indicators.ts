import { Kline } from "./binance";

// EMA (Exponential Moving Average) — makin baru datanya, makin besar
// bobotnya. Dipakai untuk mengukur arah tren.
export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  values.forEach((value, i) => {
    if (i === 0) {
      result.push(value);
    } else {
      result.push(value * k + result[i - 1] * (1 - k));
    }
  });
  return result;
}

// ATR (Average True Range) — rata-rata rentang pergerakan harga per bar,
// termasuk gap. Ukuran standar industri untuk volatilitas.
export function atr(klines: Kline[], period = 14): number {
  const trueRanges: number[] = [];
  for (let i = 1; i < klines.length; i++) {
    const curr = klines[i];
    const prevClose = klines[i - 1].close;
    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prevClose),
      Math.abs(curr.low - prevClose)
    );
    trueRanges.push(tr);
  }
  const recent = trueRanges.slice(-period);
  if (recent.length === 0) return 0;
  return recent.reduce((sum, v) => sum + v, 0) / recent.length;
}

export type Regime = "Uptrend" | "Downtrend" | "Neutral";

// Rule-based regime detection:
// - Uptrend: harga di atas EMA13 & EMA21, EMA13 > EMA21, dan EMA13 sedang naik
// - Downtrend: kebalikannya
// - Neutral: kondisi campur aduk / tidak ada keselarasan jelas
export function detectRegime(klines: Kline[]): {
  regime: Regime;
  confidence: number;
} {
  const closes = klines.map((k) => k.close);
  const ema13 = ema(closes, 13);
  const ema21 = ema(closes, 21);

  const lastClose = closes[closes.length - 1];
  const lastEma13 = ema13[ema13.length - 1];
  const lastEma21 = ema21[ema21.length - 1];

  const slopeWindow = 5;
  const slope =
    ema13[ema13.length - 1] - ema13[ema13.length - 1 - slopeWindow];

  const priceAboveEmas = lastClose > lastEma13 && lastClose > lastEma21;
  const priceBelowEmas = lastClose < lastEma13 && lastClose < lastEma21;
  const emaBullish = lastEma13 > lastEma21;
  const emaBearish = lastEma13 < lastEma21;

  let regime: Regime = "Neutral";
  let score = 55; // baseline confidence untuk kondisi Neutral

  if (priceAboveEmas && emaBullish && slope > 0) {
    regime = "Uptrend";
    score = 70;
    if (slope > lastClose * 0.002) score += 15; // momentum kuat
  } else if (priceBelowEmas && emaBearish && slope < 0) {
    regime = "Downtrend";
    score = 70;
    if (slope < -lastClose * 0.002) score += 15;
  }

  return { regime, confidence: Math.min(score, 95) };
}

export type VolatilityLevel = "Low" | "Medium" | "High";

// Threshold ATR% ini diselaraskan dengan referensi dashboard kamu
// (BTC ATR 1D 3.7% dikategorikan "Medium")
export function volatilityLevel(atrPercent: number): VolatilityLevel {
  if (atrPercent < 1) return "Low";
  if (atrPercent < 4) return "Medium";
  return "High";
}

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

// Versi ATR yang mengembalikan deret nilai per-candle (bukan cuma 1 angka
// terakhir) — dibutuhkan buat bandingin volatilitas SEKARANG vs beberapa
// candle ke belakang, misalnya buat deteksi kompresi volatilitas.
export function atrSeries(klines: Kline[], period = 14): number[] {
  const trueRanges: number[] = [0]; // index 0 gak punya prevClose, isi 0
  for (let i = 1; i < klines.length; i++) {
    const curr = klines[i];
    const prevClose = klines[i - 1].close;
    trueRanges.push(
      Math.max(
        curr.high - curr.low,
        Math.abs(curr.high - prevClose),
        Math.abs(curr.low - prevClose)
      )
    );
  }

  const series: number[] = [];
  for (let i = 0; i < trueRanges.length; i++) {
    const window = trueRanges.slice(Math.max(0, i - period + 1), i + 1);
    series.push(window.reduce((s, v) => s + v, 0) / window.length);
  }
  return series;
}

export type CompressionResult = {
  compressed: boolean;
  // Persentase penyusutan ATR rata-rata "separuh belakangan" dibanding
  // "separuh sebelumnya" dari window lookback. Positif = menyempit.
  compressionPercent: number;
};

// Deteksi kompresi volatilitas — ciri khas fase konsolidasi sebelum
// breakout (dipakai breakout trader buat "nunggu" sebelum entry, bukan
// ngejar candle yang udah lari duluan). Caranya: bandingin ATR rata-rata
// separuh terakhir window vs separuh sebelumnya — kalau separuh terakhir
// jauh lebih kecil, volatilitas lagi menyempit.
export function detectVolatilityCompression(
  klines: Kline[],
  period = 14,
  lookback = 20
): CompressionResult {
  const series = atrSeries(klines, period);
  if (series.length < lookback + 1) {
    return { compressed: false, compressionPercent: 0 };
  }

  const window = series.slice(-lookback);
  const half = Math.floor(lookback / 2);
  const earlierHalf = window.slice(0, half);
  const recentHalf = window.slice(half);

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const earlierAvg = avg(earlierHalf);
  const recentAvg = avg(recentHalf);

  if (earlierAvg <= 0) return { compressed: false, compressionPercent: 0 };

  const compressionPercent = ((earlierAvg - recentAvg) / earlierAvg) * 100;
  // Ambang 25% dipilih supaya cukup selektif (bukan noise harian biasa)
  // tapi gak terlalu jarang muncul buat kepakai praktis
  const compressed = compressionPercent >= 25;

  return { compressed, compressionPercent: Math.round(compressionPercent) };
}





// ADX (Average Directional Index) — ukuran KEKUATAN trend, TERPISAH dari
// arahnya. Beda dari detectRegime() yang cuma bilang "lagi uptrend/downtrend/
// neutral", ADX jawab pertanyaan berbeda: "seberapa kuat trend ini,
// terlepas dari arahnya?" Nilai standar industri: >25 trend kuat, 20-25
// transisi, <20 trend lemah / market cenderung ranging.
//
// Ini juga jadi dasar buat validasi Range Detection: ADX rendah adalah
// konfirmasi independen bahwa market memang lagi gak trending (bukan cuma
// "kebetulan mantul 2x doang").
export function adx(klines: Kline[], period = 14): number {
  if (klines.length < period * 2) return 0;

  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  const trueRanges: number[] = [0];

  for (let i = 1; i < klines.length; i++) {
    const upMove = klines[i].high - klines[i - 1].high;
    const downMove = klines[i - 1].low - klines[i].low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

    const prevClose = klines[i - 1].close;
    trueRanges.push(
      Math.max(
        klines[i].high - klines[i].low,
        Math.abs(klines[i].high - prevClose),
        Math.abs(klines[i].low - prevClose)
      )
    );
  }

  // Wilder's smoothing — bukan simple moving average biasa, ini teknik
  // smoothing asli dari J. Welles Wilder (pencipta ADX) yang dipakai
  // standar industri, beda dikit sama EMA
  function wilderSmooth(values: number[]): number[] {
    const result: number[] = new Array(values.length).fill(NaN);
    let sum = 0;
    for (let i = 1; i <= period; i++) sum += values[i] ?? 0;
    result[period] = sum;
    for (let i = period + 1; i < values.length; i++) {
      sum = sum - sum / period + values[i];
      result[i] = sum;
    }
    return result;
  }

  const smoothedTR = wilderSmooth(trueRanges);
  const smoothedPlusDM = wilderSmooth(plusDM);
  const smoothedMinusDM = wilderSmooth(minusDM);

  const dxSeries: number[] = [];
  for (let i = period; i < trueRanges.length; i++) {
    const tr = smoothedTR[i];
    if (!tr || Number.isNaN(tr)) continue;
    const plusDI = (100 * smoothedPlusDM[i]) / tr;
    const minusDI = (100 * smoothedMinusDM[i]) / tr;
    const sum = plusDI + minusDI;
    const dx = sum === 0 ? 0 : (100 * Math.abs(plusDI - minusDI)) / sum;
    dxSeries.push(dx);
  }

  if (dxSeries.length === 0) return 0;
  const adxWindow = dxSeries.slice(-period);
  return Math.round(adxWindow.reduce((s, v) => s + v, 0) / adxWindow.length);
}

export function trendStrengthLabel(adxValue: number): "Kuat" | "Sedang" | "Lemah" {
  if (adxValue >= 25) return "Kuat";
  if (adxValue >= 20) return "Sedang";
  return "Lemah";
}

export type VolatilityLevel = "Low" | "Medium" | "High";

// Threshold ATR% ini diselaraskan dengan referensi dashboard kamu
// (BTC ATR 1D 3.7% dikategorikan "Medium")
export function volatilityLevel(atrPercent: number): VolatilityLevel {
  if (atrPercent < 1) return "Low";
  if (atrPercent < 4) return "Medium";
  return "High";
}

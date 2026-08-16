import { Kline } from "./binance";
import { atr, detectVolatilityCompression, adx } from "./indicators";

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

export type TradingStyle = "scalping" | "day" | "swing" | "position";

// Preset per gaya trading — SEMUA dalam kelipatan ATR, jadi otomatis
// menyesuaikan skala volatilitas symbol apa pun (BTC vs saham receh vs
// forex major, dst) tanpa perlu angka absolut per aset.
//
// entryBuffer & stopBuffer: makin lebar makin "toleran" ke noise — cocok
// buat holding period lebih panjang yang bisa nahan fluktuasi lebih besar.
// tp1R/tp2R: target profit dalam kelipatan risk (R) — gaya holding lebih
// panjang biasanya incar R:R lebih besar karena entry-nya lebih jarang.
export const RISK_PROFILES: Record<
  TradingStyle,
  { entryBuffer: number; stopBuffer: number; tp1R: number; tp2R: number }
> = {
  scalping: { entryBuffer: 0.15, stopBuffer: 0.5, tp1R: 1.2, tp2R: 2 },
  // "day" adalah nilai default lama (sebelum fitur profile ini ada) —
  // dipertahankan persis supaya perilaku existing tidak berubah kalau
  // caller tidak eksplisit pilih profile
  day: { entryBuffer: 0.3, stopBuffer: 0.8, tp1R: 1.5, tp2R: 3 },
  swing: { entryBuffer: 0.5, stopBuffer: 1.5, tp1R: 2, tp2R: 4 },
  position: { entryBuffer: 0.8, stopBuffer: 2.5, tp1R: 3, tp2R: 6 },
};

export type RangeInfo = {
  ranging: boolean;
  high: number;
  low: number;
  touchesHigh: number;
  touchesLow: number;
};

// Deteksi kondisi ranging BENERAN — bukan cuma "gak jelas arahnya" (itu
// yang selama ini diwakili "Neutral" di detectRegime), tapi punya BATAS
// yang jelas: ambil high/low tertinggi-terendah dalam window, hitung
// berapa kali harga "mantul" di dekat masing-masing tepi (minimal 2x tiap
// sisi supaya bukan kebetulan), dan pastikan lebar range-nya masuk akal
// dibanding ATR (gak kegedean — itu tandanya trend besar yang kebetulan
// cuma punya 1-2 titik ekstrem, bukan konsolidasi beneran; gak kekecilan —
// itu cuma noise harian biasa).
function detectRange(
  historicalKlines: Kline[],
  currentClose: number,
  atrValue: number,
  lookback = 30
): RangeInfo {
  const recent = historicalKlines.slice(-lookback);
  if (recent.length < 10 || atrValue <= 0) {
    return { ranging: false, high: 0, low: 0, touchesHigh: 0, touchesLow: 0 };
  }

  const high = Math.max(...recent.map((k) => k.high));
  const low = Math.min(...recent.map((k) => k.low));
  const width = high - low;

  const edgeTolerance = atrValue * 0.4;
  const touchesHigh = recent.filter((k) => high - k.high <= edgeTolerance).length;
  const touchesLow = recent.filter((k) => k.low - low <= edgeTolerance).length;

  const withinRange =
    currentClose <= high + edgeTolerance && currentClose >= low - edgeTolerance;

  const ranging =
    withinRange &&
    touchesHigh >= 2 &&
    touchesLow >= 2 &&
    width >= atrValue * 1.5 &&
    width <= atrValue * 8;

  return { ranging, high, low, touchesHigh, touchesLow };
}

export type SetupResult = {
  bias: "Bullish" | "Bearish" | "Neutral";
  confidence: number;
  breakout: boolean;
  // true kalau breakout ini didahului fase kompresi volatilitas — sinyal
  // breakout yang lebih meyakinkan dibanding breakout biasa (bukan cuma
  // gerakan liar sesaat), relevan buat gaya Breakout Trading
  breakoutSetup: boolean;
  volatilityCompression: { compressed: boolean; compressionPercent: number };
  // "Trending" = entry logic ikutin arah (continuation/breakout, seperti
  // biasa). "Ranging" = entry logic KEBALIK — fade ke tepi range, bukan
  // ikutin bias. Relevan buat Range Trading.
  regime: "Trending" | "Ranging";
  trendStrength: number; // ADX, 0-100, independen dari arah
  range: { high: number; low: number } | null; // null kalau regime Trending
  // Rincian poin yang nyusun angka confidence — diambil LANGSUNG dari
  // logic penjumlahannya (bukan ditebak ulang di UI), supaya selalu akurat
  // walau formula confidence berubah di masa depan. `passed:false` berarti
  // kriteria itu gak kena poin (bukan berarti minus).
  confidenceBreakdown: { label: string; points: number; passed: boolean }[];
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

export function calculateSetup(
  klines: Kline[],
  style: TradingStyle = "day"
): SetupResult {
  if (klines.length < 30) {
    throw new Error("Data candlestick tidak cukup untuk analisis setup");
  }

  const profile = RISK_PROFILES[style] ?? RISK_PROFILES.day;

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

  // Kompresi diukur dari data SEBELUM candle breakout (exclude candle
  // terakhir) — kalau candle breakout ikut dihitung, ATR-nya pasti sudah
  // melebar duluan karena breakout itu sendiri, jadi kompresi "sebelum"
  // gerakan gak akan pernah kedeteksi. Ini yang bikin sinyal ini berguna:
  // "apakah pasar lagi ngumpulin tenaga SEBELUM meledak", bukan cuma
  // "candle ini gedhe".
  const volatilityCompression = detectVolatilityCompression(priorKlines);
  const breakoutSetup = breakout && volatilityCompression.compressed;

  // ADX rendah = konfirmasi independen bahwa market gak lagi trending kuat
  // — dipakai sebagai salah satu syarat Range Detection di bawah, bukan
  // cuma modal "kebetulan mantul 2x"
  const trendStrength = adx(klines, 14);

  // Range TIDAK dihitung kalau breakout beneran baru kejadian — breakout
  // artinya range-nya (kalau ada) baru saja ditembus, jadi state-nya udah
  // berubah jadi Trending, bukan Ranging lagi
  const rangeInfo = breakout
    ? { ranging: false, high: 0, low: 0, touchesHigh: 0, touchesLow: 0 }
    : detectRange(priorKlines, lastClose, atrValue);
  const isRanging = rangeInfo.ranging && trendStrength < 25;
  const regime: SetupResult["regime"] = isRanging ? "Ranging" : "Trending";

  // Volume confirmation: volume candle terakhir vs rata-rata 20 candle.
  // Saham/forex/emas (Yahoo/Twelve Data) kadang tidak menyediakan volume
  // yang reliable (forex & emas nyaris selalu 0). Kalau avgVolume 0, itu
  // tandanya data volume TIDAK TERSEDIA — bukan berarti "volume rendah".
  // Jangan hukum confidence cuma karena data source-nya beda; anggap
  // kriteria ini netral (lolos) supaya crypto vs saham/forex tetap
  // sebanding secara adil.
  const avgVolume =
    klines.slice(-21, -1).reduce((s, k) => s + (k.volume ?? 0), 0) / 20;
  const hasVolumeData = avgVolume > 0;
  const volumeConfirmed = hasVolumeData
    ? (lastCandle.volume ?? 0) > avgVolume * 1.2
    : true;

  let bias: SetupResult["bias"] = structure;
  if (breakoutUp) bias = "Bullish";
  if (breakoutDown) bias = "Bearish";

  // Range mode: bias TIDAK ikut struktur/breakout, tapi ikut posisi harga
  // relatif ke tepi range — ini yang bikin range trading beda fundamental
  // dari trend trading. Deket tepi bawah → cari LONG (mantul naik). Deket
  // tepi atas → cari SHORT (mantul turun). Di tengah-tengah → belum ada
  // setup yang actionable, tunggu harga mendekat ke salah satu tepi dulu.
  const edgeZone = atrValue * Math.max(profile.entryBuffer, 0.3) * 2;
  let nearRangeEdge: "low" | "high" | null = null;
  if (isRanging) {
    const distToHigh = Math.abs(rangeInfo.high - lastClose);
    const distToLow = Math.abs(lastClose - rangeInfo.low);
    if (distToLow <= edgeZone && distToLow <= distToHigh) {
      bias = "Bullish";
      nearRangeEdge = "low";
    } else if (distToHigh <= edgeZone) {
      bias = "Bearish";
      nearRangeEdge = "high";
    } else {
      bias = "Neutral";
      nearRangeEdge = null;
    }
  }

  // Rule-based confidence scoring, komponen dan bobotnya transparan
  // (mudah dijelaskan, bukan black-box)
  const checklist = isRanging
    ? [
        {
          label: `Range terkonfirmasi (${rangeInfo.touchesLow}x mantul bawah, ${rangeInfo.touchesHigh}x mantul atas)`,
          passed: true,
        },
        {
          label: "Trend lemah (ADX < 25) — konsisten dengan kondisi ranging",
          passed: trendStrength < 25,
        },
        {
          label: "Harga di dekat tepi range (setup mean-reversion)",
          passed: nearRangeEdge !== null,
        },
        { label: `Risk/Reward memadai (≥ ${profile.tp1R}R)`, passed: true }, // dihitung ulang di bawah
      ]
    : [
        { label: "Struktur trend searah bias", passed: structure === bias },
        { label: "Breakout candle impulsif terkonfirmasi", passed: breakout },
        {
          label: hasVolumeData
            ? "Volume meningkat saat breakout"
            : "Volume meningkat saat breakout (data volume tidak tersedia)",
          passed: volumeConfirmed,
        },
        { label: `Risk/Reward memadai (≥ ${profile.tp1R}R)`, passed: true }, // dihitung ulang di bawah
        {
          label: volatilityCompression.compressed
            ? `Breakout didahului kompresi volatilitas (menyempit ${volatilityCompression.compressionPercent}%)`
            : "Breakout didahului kompresi volatilitas",
          passed: breakoutSetup,
        },
        {
          label: `Trend cukup kuat (ADX ${trendStrength} — ${trendStrength >= 25 ? "kuat" : trendStrength >= 20 ? "sedang" : "lemah"})`,
          passed: trendStrength >= 25,
        },
      ];

  // Catatan: item Risk/Reward ada di index 3 di KEDUA varian checklist di
  // atas (sengaja disusun sama), jadi checklist[3] di bawah selalu tepat
  // sasaran gak peduli lagi Ranging atau Trending

  let confidence = 30;
  const confidenceBreakdown: SetupResult["confidenceBreakdown"] = [
    { label: "Skor dasar", points: 30, passed: true },
  ];

  if (isRanging) {
    const rangeConfirmed = rangeInfo.touchesLow >= 2 && rangeInfo.touchesHigh >= 2;
    if (rangeConfirmed) confidence += 20;
    confidenceBreakdown.push({
      label: "Range terkonfirmasi (mantul ≥2x tiap sisi)",
      points: 20,
      passed: rangeConfirmed,
    });

    const weakTrend = trendStrength < 25;
    if (weakTrend) confidence += 15;
    confidenceBreakdown.push({
      label: "Trend lemah (ADX < 25)",
      points: 15,
      passed: weakTrend,
    });

    const nearEdge = nearRangeEdge !== null;
    if (nearEdge) confidence += 20;
    confidenceBreakdown.push({
      label: "Harga di dekat tepi range",
      points: 20,
      passed: nearEdge,
    });
  } else {
    const structureMatch = structure === bias;
    if (structureMatch) confidence += 20;
    confidenceBreakdown.push({
      label: "Struktur trend searah bias",
      points: 20,
      passed: structureMatch,
    });

    if (breakout) confidence += 25;
    confidenceBreakdown.push({ label: "Breakout terkonfirmasi", points: 25, passed: breakout });

    if (volumeConfirmed) confidence += 15;
    confidenceBreakdown.push({
      label: "Volume mendukung",
      points: 15,
      passed: volumeConfirmed,
    });

    if (breakoutSetup) confidence += 10; // bonus: breakout dari kompresi lebih meyakinkan
    confidenceBreakdown.push({
      label: "Breakout dari kompresi volatilitas",
      points: 10,
      passed: breakoutSetup,
    });

    const strongTrend = trendStrength >= 25;
    if (strongTrend) confidence += 5; // bonus kecil: trend memang kuat, bukan cuma structure kebetulan searah
    confidenceBreakdown.push({
      label: "Trend cukup kuat (ADX ≥ 25)",
      points: 5,
      passed: strongTrend,
    });
  }

  // Entry zone: area retest di sekitar level yang baru ditembus (atau level
  // support/resistance terdekat kalau belum breakout) — KECUALI mode
  // Ranging, itu logic-nya beda total (lihat di bawah)
  const pivotForEntry = isRanging
    ? nearRangeEdge === "low"
      ? rangeInfo.low
      : nearRangeEdge === "high"
      ? rangeInfo.high
      : lastClose
    : breakoutUp
    ? priorResistance
    : breakoutDown
    ? priorSupport
    : bias === "Bullish"
    ? support
    : resistance;

  const entryBuffer = atrValue * profile.entryBuffer;
  const entryLow = pivotForEntry - entryBuffer;
  const entryHigh = pivotForEntry + entryBuffer;

  const stopBuffer = atrValue * profile.stopBuffer;
  const stopLoss = isRanging
    ? nearRangeEdge === "low"
      ? rangeInfo.low - stopBuffer // SL di luar batas range, bukan di kelipatan ATR biasa
      : nearRangeEdge === "high"
      ? rangeInfo.high + stopBuffer
      : bias === "Bearish"
      ? pivotForEntry + stopBuffer
      : pivotForEntry - stopBuffer
    : bias === "Bearish"
    ? pivotForEntry + stopBuffer
    : pivotForEntry - stopBuffer;

  const riskDistance = Math.abs(pivotForEntry - stopLoss);
  const rrOk = riskDistance > 0;
  checklist[3].passed = rrOk;
  if (rrOk) confidence += 10;
  confidenceBreakdown.push({
    label: "Risk/Reward valid (SL bukan di titik entry)",
    points: 10,
    passed: rrOk,
  });

  const direction = bias === "Bearish" ? -1 : 1;
  let tp1: number;
  let tp2: number;

  if (isRanging && nearRangeEdge !== null) {
    // Range trading TP-nya bukan kelipatan R seperti trend trading — target
    // paling wajar adalah sisi SEBERANG range, karena itu batas mean-
    // reversion-nya. TP1 di titik tengah (target konservatif, ambil profit
    // lebih cepat), TP2 mendekati tepi seberang (sedikit di dalam biar
    // realistis, gak ngarep pas presisi ke titik ekstrem)
    const rangeMid = (rangeInfo.high + rangeInfo.low) / 2;
    const oppositeEdge = nearRangeEdge === "low" ? rangeInfo.high : rangeInfo.low;
    const edgeBuffer = atrValue * 0.3;
    tp1 = rangeMid;
    tp2 =
      nearRangeEdge === "low" ? oppositeEdge - edgeBuffer : oppositeEdge + edgeBuffer;
  } else {
    tp1 = pivotForEntry + direction * riskDistance * profile.tp1R;
    tp2 = pivotForEntry + direction * riskDistance * profile.tp2R;
  }

  return {
    bias,
    confidence: Math.min(confidence, 95),
    breakout,
    breakoutSetup,
    volatilityCompression,
    regime,
    trendStrength,
    range: isRanging ? { high: rangeInfo.high, low: rangeInfo.low } : null,
    confidenceBreakdown,
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

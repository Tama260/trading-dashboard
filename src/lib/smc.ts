import { Pivot } from "./setupDetection";
import { Kline } from "./binance";

export type StructureTag = "H" | "L" | "HH" | "LH" | "HL" | "LL";
export type StructureEvent = "BOS" | "CHoCH";

export type StructureLabel = {
  time: number;
  price: number;
  tag: StructureTag;
  event?: StructureEvent;
};

// Bandingkan tiap pivot dengan pivot SEBELUMNYA yang tipenya sama (high vs
// high, low vs low), lalu tandai HH/LH/HL/LL. Sekaligus lacak status tren
// untuk mendeteksi BOS (breakout searah tren) vs CHoCH (breakout berlawanan
// arah tren, sinyal potensi pembalikan).
//
// CATATAN JUJUR: ini penyederhanaan rule-based dari konsep BOS/CHoCH asli.
// Definisi "resmi" di komunitas SMC biasanya mensyaratkan candle CLOSE
// benar-benar menembus level pivot tertentu, bukan cuma membandingkan
// pivot-ke-pivot. Versi ini cukup untuk visualisasi struktur, tapi jangan
// dianggap identik dengan indikator SMC berbayar/proprietary.
export function classifyStructure(pivots: Pivot[]): StructureLabel[] {
  const labels: StructureLabel[] = [];
  let lastHigh: Pivot | null = null;
  let lastLow: Pivot | null = null;
  let trend: "up" | "down" | "undefined" = "undefined";

  for (const pivot of pivots) {
    if (pivot.type === "high") {
      if (!lastHigh) {
        labels.push({ time: pivot.time, price: pivot.price, tag: "H" });
      } else {
        const isHigherHigh = pivot.price > lastHigh.price;
        const tag: StructureTag = isHigherHigh ? "HH" : "LH";
        let event: StructureEvent | undefined;

        if (isHigherHigh) {
          if (trend === "down") {
            event = "CHoCH"; // breakout ke atas saat tren sebelumnya turun
          } else if (trend === "up") {
            event = "BOS"; // breakout ke atas melanjutkan tren naik
          }
          trend = "up";
        }

        labels.push({ time: pivot.time, price: pivot.price, tag, event });
      }
      lastHigh = pivot;
    } else {
      if (!lastLow) {
        labels.push({ time: pivot.time, price: pivot.price, tag: "L" });
      } else {
        const isLowerLow = pivot.price < lastLow.price;
        const tag: StructureTag = isLowerLow ? "LL" : "HL";
        let event: StructureEvent | undefined;

        if (isLowerLow) {
          if (trend === "up") {
            event = "CHoCH"; // breakdown saat tren sebelumnya naik
          } else if (trend === "down") {
            event = "BOS"; // breakdown melanjutkan tren turun
          }
          trend = "down";
        }

        labels.push({ time: pivot.time, price: pivot.price, tag, event });
      }
      lastLow = pivot;
    }
  }

  return labels;
}

export type LiquiditySweep = {
  time: number;
  price: number;
  type: "buy-side" | "sell-side";
  direction: "bullish" | "bearish"; // arah reversal setelah sweep terjadi
};

// Sweep terjadi kalau candle menembus level liquidity (via wick/high/low)
// TAPI close-nya kembali ke sisi semula — pola klasik "stop hunt" sebelum
// harga berbalik arah.
export function detectLiquiditySweeps(
  klines: Kline[],
  liquidityLevels: LiquidityLevel[]
): LiquiditySweep[] {
  const sweeps: LiquiditySweep[] = [];

  for (const level of liquidityLevels) {
    for (const k of klines) {
      // Sweep cuma valid kalau terjadi SETELAH liquidity pool-nya
      // benar-benar terbentuk (setelah sentuhan terakhir yang membentuk cluster)
      if (k.time <= level.lastTime) continue;

      if (level.type === "buy-side" && k.high > level.price && k.close < level.price) {
        sweeps.push({
          time: k.time,
          price: level.price,
          type: "buy-side",
          direction: "bearish",
        });
        break; // 1 sweep per level cukup, hindari duplikat
      }
      if (level.type === "sell-side" && k.low < level.price && k.close > level.price) {
        sweeps.push({
          time: k.time,
          price: level.price,
          type: "sell-side",
          direction: "bullish",
        });
        break;
      }
    }
  }

  return sweeps;
}

export type FairValueGap = {
  startTime: number;
  endTime: number;
  displayEndTime: number; // sampai kapan box digambar (saat terisi, atau waktu candle terakhir)
  top: number;
  bottom: number;
  type: "bullish" | "bearish";
  filled: boolean;
};

function findFillIndex(
  klines: Kline[],
  fromIndex: number,
  bottom: number,
  top: number
): number {
  for (let i = fromIndex; i < klines.length; i++) {
    const k = klines[i];
    // Gap dianggap "terisi" kalau ada candle setelahnya yang masuk lagi ke
    // rentang harga gap tersebut
    if (k.low <= top && k.high >= bottom) return i;
  }
  return -1;
}

// FVG: bandingkan candle 1 dan candle 3 (lewati candle 2 di tengah). Kalau
// keduanya tidak overlap sama sekali, ada "celah" harga yang belum pernah
// ditransaksikan — ini disebut Fair Value Gap / imbalance.
export function detectFairValueGaps(klines: Kline[]): FairValueGap[] {
  const fvgs: FairValueGap[] = [];
  const lastTime = klines[klines.length - 1]?.time ?? 0;

  for (let i = 2; i < klines.length; i++) {
    const first = klines[i - 2];
    const third = klines[i];

    if (third.low > first.high) {
      const top = third.low;
      const bottom = first.high;
      const fillIndex = findFillIndex(klines, i + 1, bottom, top);
      fvgs.push({
        startTime: first.time,
        endTime: third.time,
        displayEndTime: fillIndex !== -1 ? klines[fillIndex].time : lastTime,
        top,
        bottom,
        type: "bullish",
        filled: fillIndex !== -1,
      });
    }

    if (third.high < first.low) {
      const top = first.low;
      const bottom = third.high;
      const fillIndex = findFillIndex(klines, i + 1, bottom, top);
      fvgs.push({
        startTime: first.time,
        endTime: third.time,
        displayEndTime: fillIndex !== -1 ? klines[fillIndex].time : lastTime,
        top,
        bottom,
        type: "bearish",
        filled: fillIndex !== -1,
      });
    }
  }

  return fvgs;
}

export type OrderBlock = {
  time: number;
  endTime: number;
  high: number;
  low: number;
  type: "bullish" | "bearish";
};

// Order Block: candle terakhir BERLAWANAN warna sebelum muncul candle
// impulsif kuat (body-nya jauh lebih besar dari rata-rata/ATR) yang
// menembus high/low candle sebelumnya.
export function detectOrderBlocks(
  klines: Kline[],
  atrValue: number
): OrderBlock[] {
  const blocks: OrderBlock[] = [];
  const lastTime = klines[klines.length - 1]?.time ?? 0;

  for (let i = 1; i < klines.length - 1; i++) {
    const candle = klines[i];
    const next = klines[i + 1];
    const nextBody = Math.abs(next.close - next.open);
    const isImpulsive = nextBody > atrValue * 0.8;

    const isBearishCandle = candle.close < candle.open;
    const isBullishCandle = candle.close > candle.open;

    if (
      isBearishCandle &&
      next.close > next.open &&
      isImpulsive &&
      next.close > candle.high
    ) {
      blocks.push({
        time: candle.time,
        endTime: lastTime,
        high: candle.high,
        low: candle.low,
        type: "bullish",
      });
    }

    if (
      isBullishCandle &&
      next.close < next.open &&
      isImpulsive &&
      next.close < candle.low
    ) {
      blocks.push({
        time: candle.time,
        endTime: lastTime,
        high: candle.high,
        low: candle.low,
        type: "bearish",
      });
    }
  }

  return blocks;
}
export type LiquidityLevel = {
  price: number;
  type: "buy-side" | "sell-side"; // buy-side = di atas equal high, sell-side = di bawah equal low
  touches: number;
  firstTime: number;
  lastTime: number;
};

// Kelompokkan pivot yang harganya berdekatan (dalam toleransi %) — ini
// mendeteksi "Equal High/Equal Low", area di mana harga berulang kali
// mental di level yang hampir sama, biasanya karena banyak stop-loss/order
// menumpuk di situ (disebut liquidity pool).
export function detectLiquidityPools(
  pivots: Pivot[],
  tolerancePercent = 0.15
): LiquidityLevel[] {
  function cluster(
    points: Pivot[],
    type: "buy-side" | "sell-side"
  ): LiquidityLevel[] {
    const sorted = [...points].sort((a, b) => a.price - b.price);
    const clusters: LiquidityLevel[] = [];

    for (const p of sorted) {
      const existing = clusters.find(
        (c) => (Math.abs(c.price - p.price) / p.price) * 100 <= tolerancePercent
      );

      if (existing) {
        // Update rata-rata harga cluster secara incremental
        existing.price =
          (existing.price * existing.touches + p.price) / (existing.touches + 1);
        existing.touches += 1;
        existing.firstTime = Math.min(existing.firstTime, p.time);
        existing.lastTime = Math.max(existing.lastTime, p.time);
      } else {
        clusters.push({
          price: p.price,
          type,
          touches: 1,
          firstTime: p.time,
          lastTime: p.time,
        });
      }
    }

    // Hanya level yang tersentuh ≥2 kali yang benar-benar "equal" —
    // 1 sentuhan bukan liquidity pool, cuma pivot biasa
    return clusters.filter((c) => c.touches >= 2);
  }

  const highs = pivots.filter((p) => p.type === "high");
  const lows = pivots.filter((p) => p.type === "low");

  return [...cluster(highs, "buy-side"), ...cluster(lows, "sell-side")];
}

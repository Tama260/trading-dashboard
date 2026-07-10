import { Pivot } from "./setupDetection";

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

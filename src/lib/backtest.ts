import { Kline } from "./binance";
import { calculateSetup, TradingStyle } from "./setupDetection";

export type BacktestTrade = {
  entryIndex: number;
  entryTime: number;
  entryPrice: number;
  direction: "long" | "short";
  exitIndex: number;
  exitTime: number;
  exitPrice: number;
  outcome: "tp1" | "tp2" | "sl" | "timeout";
  rMultiple: number;
};

export type BacktestResult = {
  totalTrades: number;
  wins: number;
  losses: number;
  timeouts: number;
  winRate: number; // % dari trade yang closed beneran (timeout dikecualikan)
  avgR: number;
  totalR: number;
  equityCurve: { index: number; cumulativeR: number }[];
  recentTrades: BacktestTrade[]; // dibatasi biar payload API gak kegedean
};

// Window candle yang dipakai calculateSetup di TIAP titik simulasi — sama
// persis dengan yang dipakai TradeSetupPanel secara live (/api/setup pakai
// limit 100), supaya backtest ini beneran ngetes "kalau kamu pakai
// dashboard ini kemarin-kemarin", bukan engine yang beda.
const LOOKBACK = 100;

// Maksimal candle nunggu TP/SL kesentuh sebelum trade dianggap "timeout"
// (gak exit dengan jelas) — dibatasi biar simulasi gak nunggu selamanya
// buat sinyal yang gak pernah kena TP maupun SL.
const MAX_HOLD_BARS = 100;

// ASUMSI YANG DISEDERHANAKAN (baca ini sebelum percaya angka win-rate-nya
// mentah-mentah):
// 1. TP1 kesentuh dianggap EXIT PENUH — di dunia nyata banyak trader partial
//    exit di TP1 lalu let-profit-run ke TP2, tapi itu butuh aturan tambahan
//    yang subjektif (berapa % di-exit, dst), jadi disederhanakan dulu.
// 2. Kalau SL dan TP kesentuh di candle YANG SAMA, SL dianggap menang duluan
//    (asumsi konservatif/pesimis — standar praktik backtest, karena kita
//    gak tahu urutan sebenarnya dalam candle itu tanpa data tick).
// 3. Tidak memperhitungkan fee, funding rate (Perpetual), atau slippage.
// 4. Entry diasumsikan PERSIS kena di titik tengah Entry Zone — di dunia
//    nyata entry zone bisa aja gak pernah tersentuh sama sekali.
export function runBacktest(
  klines: Kline[],
  style: TradingStyle = "day"
): BacktestResult {
  const trades: BacktestTrade[] = [];
  let i = LOOKBACK;

  while (i < klines.length - 1) {
    const window = klines.slice(Math.max(0, i - LOOKBACK + 1), i + 1);

    let setup;
    try {
      setup = calculateSetup(window, style);
    } catch {
      i++;
      continue;
    }

    // Cuma masuk sebagai "sinyal" kalau breakout BENERAN kejadian di candle
    // ini (persis momen badge breakout bakal muncul di UI live) — bukan
    // tiap candle yang biasnya kebetulan searah, biar gak dobel-hitung
    // sinyal yang sama berkali-kali
    if (setup.breakout && setup.bias !== "Neutral") {
      const direction: "long" | "short" = setup.bias === "Bullish" ? "long" : "short";
      const entryPrice = (setup.levels.entryLow + setup.levels.entryHigh) / 2;
      const sl = setup.levels.stopLoss;
      const tp1 = setup.levels.tp1;
      const tp2 = setup.levels.tp2;
      const riskPerUnit = Math.abs(entryPrice - sl);

      if (riskPerUnit > 0) {
        let exitIndex = -1;
        let outcome: BacktestTrade["outcome"] = "timeout";
        let exitPrice = entryPrice;

        const scanEnd = Math.min(klines.length, i + 1 + MAX_HOLD_BARS);
        for (let j = i + 1; j < scanEnd; j++) {
          const bar = klines[j];
          const hitSL = direction === "long" ? bar.low <= sl : bar.high >= sl;
          const hitTP2 = direction === "long" ? bar.high >= tp2 : bar.low <= tp2;
          const hitTP1 = direction === "long" ? bar.high >= tp1 : bar.low <= tp1;

          if (hitSL) {
            outcome = "sl";
            exitPrice = sl;
            exitIndex = j;
            break;
          }
          if (hitTP2) {
            outcome = "tp2";
            exitPrice = tp2;
            exitIndex = j;
            break;
          }
          if (hitTP1) {
            outcome = "tp1";
            exitPrice = tp1;
            exitIndex = j;
            break;
          }
        }

        if (exitIndex === -1) {
          exitIndex = scanEnd - 1;
          exitPrice = klines[exitIndex]?.close ?? entryPrice;
        }

        const rMultiple =
          outcome === "sl"
            ? -1
            : outcome === "timeout"
            ? (direction === "long" ? exitPrice - entryPrice : entryPrice - exitPrice) /
              riskPerUnit
            : Math.abs(exitPrice - entryPrice) / riskPerUnit;

        trades.push({
          entryIndex: i,
          entryTime: klines[i].time,
          entryPrice,
          direction,
          exitIndex,
          exitTime: klines[exitIndex].time,
          exitPrice,
          outcome,
          rMultiple: Math.round(rMultiple * 100) / 100,
        });

        // Lompat ke setelah trade ini selesai — hindari overlap trade di
        // symbol yang sama (gak realistis buka 2 posisi bersamaan dari
        // sinyal yang beruntun)
        i = exitIndex + 1;
        continue;
      }
    }

    i++;
  }

  const closedTrades = trades.filter((t) => t.outcome !== "timeout");
  const wins = closedTrades.filter((t) => t.rMultiple > 0).length;
  const losses = closedTrades.filter((t) => t.rMultiple <= 0).length;
  const timeouts = trades.length - closedTrades.length;
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;
  const totalR = trades.reduce((s, t) => s + t.rMultiple, 0);
  const avgR = trades.length > 0 ? totalR / trades.length : 0;

  let cumulative = 0;
  const equityCurve = trades.map((t, idx) => {
    cumulative += t.rMultiple;
    return { index: idx, cumulativeR: Math.round(cumulative * 100) / 100 };
  });

  return {
    totalTrades: trades.length,
    wins,
    losses,
    timeouts,
    winRate: Math.round(winRate * 10) / 10,
    avgR: Math.round(avgR * 100) / 100,
    totalR: Math.round(totalR * 100) / 100,
    equityCurve,
    recentTrades: trades.slice(-30).reverse(),
  };
}

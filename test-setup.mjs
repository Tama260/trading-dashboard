// Quick sanity test dengan data sintetis — bukan unit test formal, cuma
// mastiin calculateSetup() gak crash & hasilnya masuk akal buat kondisi
// ranging vs trending vs breakout
import { calculateSetup } from "./src/lib/setupDetection.ts";

function makeRangingKlines(n = 60) {
  const klines = [];
  let t = 1700000000;
  for (let i = 0; i < n; i++) {
    // Osilasi antara 100-110 (range jelas), noise kecil
    const phase = (i % 10) / 10;
    const base = 100 + 10 * Math.abs(Math.sin(phase * Math.PI * 2));
    const open = base + (Math.random() - 0.5) * 0.5;
    const close = base + (Math.random() - 0.5) * 0.5;
    const high = Math.max(open, close) + Math.random() * 0.5;
    const low = Math.min(open, close) - Math.random() * 0.5;
    klines.push({ time: t, open, high, low, close, volume: 1000 + Math.random() * 500 });
    t += 3600;
  }
  return klines;
}

function makeTrendingKlines(n = 60) {
  const klines = [];
  let t = 1700000000;
  let price = 100;
  for (let i = 0; i < n; i++) {
    price += 0.8 + Math.random() * 0.4; // uptrend konsisten
    const open = price - 0.3;
    const close = price;
    const high = close + Math.random() * 0.3;
    const low = open - Math.random() * 0.3;
    klines.push({ time: t, open, high, low, close, volume: 1000 + Math.random() * 500 });
    t += 3600;
  }
  return klines;
}

console.log("=== RANGING DATA ===");
try {
  const result = calculateSetup(makeRangingKlines(), "day");
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error("CRASH:", e);
}

console.log("\n=== TRENDING DATA ===");
try {
  const result = calculateSetup(makeTrendingKlines(), "day");
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error("CRASH:", e);
}

console.log("\n=== SEMUA TRADING STYLE (data trending) ===");
for (const style of ["scalping", "day", "swing", "position"]) {
  try {
    const result = calculateSetup(makeTrendingKlines(), style);
    console.log(`${style}: bias=${result.bias} conf=${result.confidence} SL=${result.levels.stopLoss.toFixed(2)} TP1=${result.levels.tp1.toFixed(2)} TP2=${result.levels.tp2.toFixed(2)}`);
  } catch (e) {
    console.error(`${style} CRASH:`, e.message);
  }
}

# Rencana: Dukungan Multi-Gaya Trading

Bukan cuma scalping — dashboard ini mau dipakai buat day trading, swing
trading, position trading, trend trading, breakout trading, range trading,
dst. Kabar baiknya: **gak perlu bikin engine terpisah per gaya.** Engine
yang ada sekarang (`setupDetection.ts` + `smc.ts` + `indicators.ts`) sudah
cukup general — sebagian besar gaya beda di *parameter* dan *cara baca*,
bukan di logic dasarnya.

## Kondisi engine sekarang (dicek langsung dari kode)

- `detectRegime()` di `indicators.ts` cuma punya 3 output: Uptrend,
  Downtrend, Neutral — "Neutral" itu sekadar "gak confidently trending",
  BUKAN range detector beneran (gak ada batas atas/bawah range, gak ada
  ukuran kekuatan trend yang independen dari arah)
- Structure detection (`smc.ts`: BOS/CHoCH, liquidity sweep, FVG, order
  block) sebenarnya sudah cukup dekat dengan logic breakout trading — BOS
  itu literally "breakout dari struktur sebelumnya"
- Entry/SL/TP (`setupDetection.ts`) sekarang pakai 1 formula ATR yang sama
  buat semua timeframe & semua gaya

## Strategi: satu engine, empat lapis penyesuaian

### Lapis 1 — Trading Style Profile (paling murah, paling besar dampaknya)

Preset config per gaya, TANPA logic baru — cuma parameter beda:

| Gaya | Timeframe default | ATR multiplier SL | Target R:R | Label holding |
|---|---|---|---|---|
| Scalping | 1m-15m | 1.0x (ketat) | 1:1.5 | Menit |
| Day Trading | 15m-1h | 1.5x | 1:2 | Jam-1 hari |
| Swing Trading | 4h-1d | 2.5x | 1:3 | Hari-minggu |
| Position Trading | 1d-1w | 3.5x | 1:4+ | Minggu-bulan |

Timeframe selector yang udah saya bikin kemarin (1m/5m/15m/1h) tinggal
diperluas ke 4h/1d/1w, dan ATR multiplier di `setupDetection.ts` (sekarang
kemungkinan fixed) dibikin terima parameter sesuai profile ini.

**Sekaligus mencakup:** Day Trading, Swing Trading, Position Trading —
tanpa nulis satu baris logic deteksi baru.

### Lapis 2 — Trend Trading (refinement kecil)

- Tambah "trend strength score" independen dari arah (mirip ADX) di
  `indicators.ts`
- Filter entry: cuma munculin sinyal continuation (pullback ke struktur)
  kalau trend strength-nya tinggi — bukan sinyal reversal

### Lapis 3 — Breakout Trading (refinement kecil, reuse BOS yang sudah ada)

- Tambah "Volatility Compression" — deteksi ATR/range yang menyempit
  beberapa candle terakhir (ciri khas sebelum breakout)
- Begitu compression terdeteksi + BOS beneran kejadian (udah ada di
  `smc.ts`) → tandai sebagai "Breakout Setup" dengan confidence lebih
  tinggi

### Lapis 4 — Range Trading (paling banyak kerjaannya, genuinely baru)

- Deteksi kondisi ranging beneran: ambil swing high/low terakhir, cek
  apakah harga mantul di antara keduanya berkali-kali tanpa breakout
- Kalau kondisi range terkonfirmasi: balik logic entry-nya — bukan ikutin
  bias, tapi FADE ke tepi range (entry dekat range low buat long, dekat
  range high buat short), TP ke sisi seberang, SL di luar batas range

## Urutan pengerjaan yang saya sarankan

1. **Trading Style Profile** dulu — paling murah, langsung "membuka" Day/
   Swing/Position Trading sekaligus, dan jadi fondasi buat lapis lainnya
2. **Volatility Compression** — kecil, buka Breakout Trading
3. **Trend Strength Score** — kecil, nyempurnain Trend Trading
4. **Range Detection** — paling besar, dikerjain terakhir setelah 3 di atas
   stabil (karena butuh data/testing paling banyak buat validasi ambang
   batasnya)

---

*Silakan pilih mau mulai dari mana — saya rekomendasikan urutan di atas,
tapi kalau ada gaya tertentu yang paling penting buat kamu duluan, bisa
kita loncat ke situ.*

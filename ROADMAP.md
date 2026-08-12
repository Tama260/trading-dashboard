# Feature Roadmap — Trading Intelligence Dashboard

Catatan ide pengembangan lanjutan, diurutkan berdasarkan prioritas dampak ke
portofolio (bukan cuma "fitur keren", tapi yang nambah kredibilitas &
kedalaman teknis di mata recruiter).

## 1. Backtesting Module — PRIORITAS TERTINGGI

**Kenapa:** Engine `setupDetection.ts` + `smc.ts` sekarang cuma kasih sinyal
real-time. Tanpa bukti historis, dashboard trading gampang dianggap gimmick
oleh siapa pun yang review. Backtest adalah bukti paling kuat kalau logic-nya
beneran punya edge (atau minimal, jujur soal performanya).

**Rough plan:**
- Ambil kline historis (udah ada di `binance.ts`/`idxStocks.ts`)
- Loop rolling window, jalanin `calculateSetup()` di tiap titik waktu
- Simulasikan entry di entry zone, exit di SL/TP1/TP2 sesuai harga yang
  benar-benar kejadian setelahnya
- Hitung: win-rate, avg R:R realized, total sinyal per kategori aset
- Render sebagai halaman/tab baru: `/backtest`

## 2. Trade Journal + Statistik

**Kenapa:** `PositionTracker` yang sudah ada baru sebatas catat posisi
manual. Extend jadi jurnal dengan hasil (win/loss/breakeven), catatan, dan
statistik otomatis (win-rate, total R, streak) — nunjukin product thinking
end-to-end, bukan cuma "kasih sinyal terus lupa".

**Rough plan:**
- Tambah field `result`, `exitPrice`, `exitDate`, `notes` ke posisi yang ada
- Simpan ke Supabase (sudah ada di stack) biar persist antar sesi
- Panel statistik ringkas di atas daftar posisi

## 3. Alert ke Telegram

**Kenapa:** Paling murah buat dibangun karena reuse langsung pengalaman dari
project VICE-AI / Personal Brand OS (Telegram Bot API). Auto-notify saat ada
setup confidence tinggi (>75%) baru muncul di watchlist mana pun.

**Rough plan:**
- Cron/interval check di server (atau trigger dari polling client-side)
- Format pesan: symbol, kategori, bias, entry/SL/TP, confidence
- Reuse pola BYOK: user masukin bot token & chat ID sendiri di settings

## 4. Multi-Timeframe Confluence

**Kenapa:** Sekarang tiap symbol cuma dianalisis di 1 timeframe. Trader SMC
serius biasanya cek konfirmasi lintas timeframe (mis. 15m, 1h, 4h) sebelum
percaya sebuah entry — nambah kedalaman analisis yang genuinely dipakai di
dunia nyata, bukan cuma dekorasi UI.

**Rough plan:**
- Fetch klines di 2-3 interval sekaligus buat symbol yang sama
- Bandingkan bias tiap timeframe — kalau konflik, confidence diturunin
- Tampilkan breakdown "15m: Bullish, 1h: Bullish, 4h: Neutral" di panel

## 5. Unit Test buat Engine

**Kenapa:** `setupDetection.ts` dan `smc.ts` sekarang nol test. Recruiter
teknis yang buka repo biasanya notice ini duluan — nulis test buat pure
function (gampang di-test karena gak ada side effect) adalah low-hanging
fruit yang dampaknya besar ke persepsi "engineering maturity".

**Rough plan:**
- Setup Jest/Vitest
- Test `calculateSetup()`, `classifyStructure()`, `findPivots()`, dst pakai
  data kline dummy (uptrend jelas, downtrend jelas, choppy/sideways)
- Edge case: kline kosong, volume 0 (kasus saham/forex), pivot ambigu

---

*Dokumen ini cuma catatan ide, bukan komitmen — pilih sesuai waktu & minat.
Kalau mau mulai salah satu, tinggal bilang mana yang mau dikerjain duluan.*

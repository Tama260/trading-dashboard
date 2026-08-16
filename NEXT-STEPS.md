# Status & Rencana Lanjutan (Konsolidasi)

Project ini sekarang punya 3 dokumen rencana terpisah (`ROADMAP.md`,
`SCALPING-FEATURES.md`, `WOW-FEATURES.md`) yang beberapa itemnya
tumpang-tindih. Dokumen ini rangkumannya — sumber kebenaran tunggal soal
apa yang UDAH dan BELUM dikerjakan.

## ✅ Sudah selesai (ringkasan)

- Fix bug Perpetual/Spot ketuker + timeout fetch (5 detik, gak nge-hang lagi)
- Engine Setup Detection & SMC digeneralisasi ke Saham/Forex/Emas
- Trading Style Profile (Scalping/Day/Swing/Position) — SL/TP/timeframi
  otomatis nyesuaikan
- Timeframe rendah (1m-1w) + refresh cepat buat crypto
- Volatility Compression → Breakout Setup detection
- Trend Strength (ADX) + Range Detection (fade ke tepi range)
- Market Scanner / Heatmap — scan seluruh watchlist sekaligus
- AI Commentary otomatis per setup
- Confidence Breakdown Chart
- Command Palette (Cmd/Ctrl+K)
- Deploy ke Vercel + custom domain + credit di footer

## ⬜ Belum dikerjakan — diurutkan dari yang saya rekomendasikan duluan

### 1. Backtesting Module ✅ SUDAH DIKERJAKAN
Simulasi sinyal breakout historis pakai engine yang PERSIS SAMA dengan yang
live (`runBacktest()` di `src/lib/backtest.ts`, dipanggil `/api/backtest`).
Window 100 candle, cek forward sampai 100 candle nunggu SL/TP1/TP2, kalau
gak kesentuh dianggap timeout. Hasil: win-rate, avg R, total R, equity
curve (chart), riwayat 30 sinyal terakhir. Tombol "🧪 Backtesting" ada di
tiap Setup Detection panel (`BacktestPanel.tsx`), pakai symbol/timeframe/
gaya trading yang lagi aktif — bukan halaman terpisah. Asumsi yang
disederhanakan (TP1 = exit penuh, SL menang kalau tabrakan sama TP di
candle sama, gak ada fee/funding/slippage) didokumentasikan jelas di kode
DAN ditampilkan sebagai disclaimer di UI.

### 2. Trade Journal + Statistik + Position Sizing Calculator ✅ SUDAH DIKERJAKAN
- **Trade Journal** (`PositionTracker.tsx`): catat posisi open/closed, P&L,
  R-multiple, win-rate, avg R, streak menang/kalah beruntun — semua
  tersimpan di localStorage
- **Position Sizing Calculator** (`PositionSizeCalculator.tsx`): input
  modal + risk% + leverage → otomatis hitung ukuran posisi & margin
  dibutuhkan, berdasarkan Entry Zone & Stop Loss yang lagi aktif
- **Tombol "📓 Log Trade Ini ke Journal"**: ditambahkan di TradeSetupPanel
  — auto-isi form journal dari setup yang lagi tampil (symbol, arah,
  entry, SL, TP1, catatan gaya trading & confidence), user tinggal
  konfirmasi simpan. Sebelumnya PositionTracker udah siap nerima event
  ini tapi belum ada tombol yang ngirimnya — celah ini sudah ditutup.

### 3. Shareable Setup Card
Export Setup Detection jadi gambar siap-post — nyambung ke background
content creator kamu, effort sedang.

### 4. Unit Test buat Engine
`setupDetection.ts` + `smc.ts` masih nol test. Murni sinyal engineering
maturity ke siapa pun yang review kode.

### 5. Alert ke Telegram
Reuse pengalaman Telegram Bot API dari project sebelumnya (VICE-AI,
Personal Brand OS) — notify otomatis pas ada setup confidence tinggi.

### 6. Funding Rate + Open Interest + Spread (khusus Perpetual)
Data tambahan yang relevan banget buat scalping/day trading crypto
perpetual, belum ada sama sekali di dashboard sekarang.

### 7. Overtrading Guard
Butuh Trade Journal (#2) jalan duluan — deteksi pola overtrading/revenge
trading dari histori transaksi.

### 8. Micro-animation (framer-motion)
Polish murni, prioritas paling rendah — transisi CSS yang ada sekarang
sudah cukup buat kebanyakan kebutuhan.

---

*Kalau mau lanjut, tinggal sebut nomernya atau nama fiturnya. Saya
rekomendasikan #1 (Backtesting) atau #2 (Journal+Calculator) duluan —
keduanya paling nambah substansi, baik buat portofolio maupun buat
kebutuhan analisis kamu sendiri.*

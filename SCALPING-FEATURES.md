# Rencana Fitur — Analisis & Scalping Pribadi

Beda dari `ROADMAP.md` (yang fokus ke nilai portofolio buat recruiter),
dokumen ini fokus ke kebutuhan Daffa pakai dashboard ini buat analisis &
belajar scalping beneran.

## Keterbatasan sekarang (WAJIB dibenerin duluan)

- Setup Detection crypto hardcode di interval **1 jam** (`AnalysisSection.tsx`)
- Refresh Setup Detection tiap **30 detik** (`TradeSetupPanel.tsx`)
- Harga live lewat **REST polling tiap 3 detik** (`LivePrice.tsx`), bukan
  WebSocket
- Saham/forex/emas hardcode di interval **1 hari**

Buat scalping (candle 1m-15m, keputusan dalam hitungan menit), ini semua
terlalu lambat. Ini prioritas paling atas sebelum fitur lain kepakai
maksimal.

## 1. Timeframe rendah + WebSocket (fondasi wajib)

- Dropdown pilihan interval di "Analisis Untuk": 1m, 5m, 15m, 1h
- Ganti `LivePrice.tsx` dari REST polling ke Binance WebSocket
  (`wss://stream.binance.com:9443/ws/<symbol>@ticker`, ada versi futures-nya
  juga di `wss://fstream.binance.com`)
- Setup Detection tetap boleh REST tapi refresh lebih cepat (5-10 detik)
  buat timeframe rendah

## 2. Position Sizing Calculator

- Input: modal, risk % per trade, leverage
- Output otomatis: ukuran posisi, max loss (Rp/USD), ditempel di tiap Setup
  Detection card
- Ini pagar pengaman paling penting — scalping pakai leverage tinggi paling
  gampang bikin akun abis kalau sizing asal

## 3. Funding Rate + Open Interest + Spread (khusus Perpetual)

- Funding rate saat ini + histori 8 jam (`/fapi/v1/fundingRate`)
- Open interest (`/fapi/v1/openInterest`)
- Bid-ask spread dari orderbook (`/fapi/v1/depth`, ambil best bid/ask)

## 4. Trade Journal super-cepat

- Tombol "Log trade ini" langsung di Setup Detection card — auto-isi
  symbol, entry, SL, TP dari data yang lagi tampil, tinggal pilih hasil
  setelah closed
- Statistik per sesi (Asia/London/NY) biar keliatan pola performa

## 5. Overtrading Guard

- Baca dari Trade Journal: hitung entry dalam 1 jam terakhir, loss beruntun
- Warning halus (bukan blokir) kalau pola udah masuk overtrading/revenge
  trading — ini penyebab #1 akun scalper jebol

---

*Prioritas: kerjain #1 dulu (fondasi), baru #2 (keselamatan modal), sisanya
fleksibel sesuai kebutuhan belajar kamu.*

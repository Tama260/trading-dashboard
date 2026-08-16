# Ide Fitur "Wow Factor"

Beda dari `ROADMAP.md` (kredibilitas teknis) dan `SCALPING-FEATURES.md`
(kebutuhan pemakaian pribadi) — dokumen ini fokus ke fitur yang bikin
kesan visual/demo kuat dalam beberapa detik pertama, relevan buat
interview atau nunjukin ke recruiter.

## 1. Market Scanner / Heatmap ✅ SUDAH DIKERJAKAN

**Kenapa paling "wow" buat effort paling kecil:** sekarang user harus pilih
1 symbol dulu buat lihat analisisnya. Heatmap nunjukin SEMUA symbol
sekaligus dalam 1 pandangan, warna berdasarkan bias & confidence — look
yang khas Bloomberg Terminal / TradingView Screener. Recruiter yang buka
demo langsung dapat kesan "ini scanning banyak aset sekaligus", bukan cuma
1 chart.

**Implementasi:** `MarketScanner.tsx`, ditaruh paling atas halaman (kesan
pertama). Baca watchlist ASLI user dari localStorage (bukan default statis)
untuk crypto/saham/forex/emas, scan semua paralel lewat `/api/setup` &
`/api/stock-setup` yang sudah ada. Crypto discan sebagai Spot saja (biar
gak kena isu reachability Futures yang udah kita bahas panjang). Auto-
refresh tiap 60 detik, klik sel buat expand detail entry/SL/TP inline.

## 2. Shareable Setup Card

**Kenapa relevan:** nyambung langsung ke background content creator kamu
(TikTok/Shopee/IG Reels). Satu klik dapat gambar siap-post yang keliatan
profesional, kayak yang biasa di-share trader di Twitter/Telegram.

**Rough plan:**
- Tombol "Export sebagai gambar" di tiap Setup Detection card
- Render ke canvas (pakai html2canvas atau native Canvas API): symbol,
  bias, entry/SL/TP, badge breakout/range, watermark nama & link portofolio
- Download langsung sebagai PNG

## 3. AI Commentary Otomatis per Setup ✅ SUDAH DIKERJAKAN

**Kenapa:** AI chat sekarang cuma jawab kalau ditanya. Auto-generate 2-3
kalimat narasi tiap ada setup baru muncul bikin dia kerasa lebih hidup dan
pintar — padahal reuse infrastruktur `/api/ai-chat` yang udah ada.

**Implementasi:** `AISetupCommentary.tsx`, dipasang di `TradeSetupPanel`
tepat di bawah checklist. Cuma generate ulang kalau SINYAL beneran berubah
(bias/regime/breakoutSetup/confidence dibulatkan ke kelipatan 10) — bukan
tiap poll refresh — biar gak boros API call. Pakai provider/API key yang
sama dengan AI Chat (di-extract ke `src/lib/aiSettings.ts` biar 1 sumber
kebenaran). Kalau user belum setting API key, tampil ajakan halus buat
aktifin di AI Chat, bukan error.

## 4. Confidence Breakdown Chart ✅ SUDAH DIKERJAKAN

**Kenapa:** confidence score sekarang cuma angka + list checklist teks.
Visualisasi kecil (bar chart pakai Recharts) bikin skor rule-based kerasa
lebih "berbasis data", bukan asal tebak.

**Implementasi:** `ConfidenceBreakdown.tsx`. Ketemu field `confidenceBreakdown`
udah ada di `setupDetection.ts` (poin per kriteria, sumber tunggal — bukan
ditebak ulang di UI), cuma belum ke-include di return value & belum
dipakai di mana pun — saya sambungkan. Sekalian ketemu 1 celah kecil: bonus
Risk/Reward (+10) gak ikut tercatat di breakdown (cuma nempel di angka
`confidence` mentah) — sudah dibenerin. Chart nunjukin batang hijau (poin
didapat) vs abu (poin gak didapat), dan kasih catatan transparan kalau
total poin mentahnya melebihi 95 (dibatasi, biar gak pernah nampilin 100%
"pasti").

## 5. Polish UX kecil-kecil ✅ SEBAGIAN DIKERJAKAN

- ✅ Command palette (Cmd/Ctrl+K) — `CommandPalette.tsx`, cari symbol apa
  pun di seluruh watchlist, pilih → scroll & expand otomatis ke Market
  Scanner (reuse UI yang udah ada, bukan bikin komponen detail baru)
- ✅ Loading skeleton — sel Market Scanner sekarang pakai skeleton bar
  pulse, bukan teks "Memuat..." polos
- ⬜ Micro-animation pakai framer-motion — belum dikerjakan (transisi CSS
  polos sudah dipakai di beberapa tempat sebagai gantinya, cukup buat
  sekarang; framer-motion nambah 1 dependency lagi kalau mau yang lebih
  halus)

Ini murni polish tanpa fitur baru, tapi detail kecil kayak gini yang bikin
recruiter teknis notice "oh ini beneran dikerjain niat".

---

*Rekomendasi urutan: Market Scanner dulu (dampak visual terbesar, effort
kecil-menengah), baru pilih 1-2 dari sisanya sesuai waktu yang ada.*

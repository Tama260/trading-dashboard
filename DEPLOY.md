# Deploy ke Vercel

Panduan ini spesifik buat project Trading Intelligence Dashboard ini — bukan panduan generic.

## Kenapa deploy menyelesaikan masalah Perpetual/Bitget

Server Vercel jalan di data center luar negeri (default: Washington DC, AS —
bisa diganti region-nya di Project Settings > Functions). Karena bukan
koneksi rumah/ISP kamu di Indonesia, domain `fapi.binance.com` dan
`api.bitget.com` yang sebelumnya diblokir dari localhost kamu, harusnya
bisa diakses normal dari server Vercel.

## Langkah 1 — Push ke GitHub

Kalau project ini belum jadi git repo:

```bash
cd "path/ke/trading-dashboard"
git init
git add .
git commit -m "Initial commit"
```

Buat repo baru di https://github.com/new (boleh Private), lalu:

```bash
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git branch -M main
git push -u origin main
```

`.gitignore` sudah saya tambahin di project ini — pastikan kamu commit versi
yang sudah ada file itu, supaya `node_modules` dan `.env.local` (isinya API
key) TIDAK ikut ke-push.

## Langkah 2 — Import di Vercel

1. Buka https://vercel.com, login pakai akun GitHub kamu.
2. Klik **Add New > Project**.
3. Pilih repo yang baru kamu push.
4. Framework Preset otomatis kedeteksi **Next.js** — biarkan default
   (Build Command: `next build`, Output: default). Tidak perlu ubah apa-apa.

## Langkah 3 — Set Environment Variables (WAJIB)

Sebelum klik Deploy, buka tab **Environment Variables** di halaman import,
tambahkan persis 2 ini (nilai dari akun kamu masing-masing):

| Key | Kegunaan | Dapat dari |
|---|---|---|
| `TWELVE_DATA_API_KEY` | Data Saham AS & Emas | https://twelvedata.com (daftar gratis) |
| `FINNHUB_API_KEY` | Sumber utama Saham AS (limit lebih longgar) | https://finnhub.io (daftar gratis) |

Kalau kamu sudah punya file `.env.local` di local, tinggal copy-paste
value-nya dari situ — JANGAN commit file `.env.local` itu sendiri ke GitHub.

## Langkah 4 — Deploy

Klik **Deploy**. Build biasanya selesai 1-2 menit. Setelah selesai, Vercel
kasih URL publik (`nama-project.vercel.app`) — ini yang bisa kamu taruh di
CV/portofolio kamu.

## Langkah 5 — Verifikasi Perpetual jalan

Buka URL live-nya, scroll ke bagian **Crypto — Perpetual**, tunggu beberapa
detik. Kalau sebelumnya di localhost selalu "Error", di sini harusnya sudah
muncul harga & Setup Detection normal — ini konfirmasi dugaan blokir ISP
tadi benar.

## Kalau MASIH error setelah deploy

Kemungkinannya bukan lagi soal jaringan, tapi salah satu dari:
- Env variable belum ke-set dengan benar (cek lagi di Project Settings > Environment Variables, lalu **Redeploy**)
- Region server Vercel kamu kebetulan juga diblokir (jarang, tapi coba ganti region di Project Settings > Functions > Region)

## Auto-deploy selanjutnya

Setelah repo ke-connect ke Vercel, setiap kali kamu `git push` ke branch
`main`, Vercel otomatis build & deploy ulang — gak perlu upload manual lagi.

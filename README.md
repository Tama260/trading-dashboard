<div align="center">

# 📊 Trading Intelligence Dashboard

**A rule-based multi-asset trading analysis platform — Crypto, Stocks, Forex & Gold, all in one dashboard.**

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat&logo=vercel)](https://vercel.com)

**[🔴 Live Demo](https://trading-dashboard-by-dna-.vercel.app)** · **[📖 Documentation](./docs)** · **[🐛 Report an Issue](https://github.com/Tama260/trading-dashboard/issues)**

</div>

---

> ⚠️ **Disclaimer:** This project is built for **educational and portfolio
> purposes only**. It is **not financial advice**. Every signal comes
> from deterministic, rule-based logic (price structure, ATR, breakout
> detection) — **not machine learning**, and **not a promise of future
> results**. Markets are uncertain by nature. Always **DYOR (Do Your Own
> Research)** and apply proper risk management before making any trading
> decision.

---

## 📚 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Screenshots](#️-screenshots)
- [Tech Stack](#️-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [How to Use](#-how-to-use)
- [Project Structure](#-project-structure)
- [Documentation](#-documentation)
- [Author](#-author)

---

## 🔎 About

**Trading Intelligence Dashboard** is a full-stack analysis tool that
scans and evaluates trade setups across **four asset classes at once** —
Crypto (Spot & Perpetual), US/Indonesian stocks, Forex, and Gold — using
a single shared rule-based engine (pivot structure, ATR, breakout,
liquidity sweeps, fair value gaps, and order blocks).

It was built as a portfolio project to demonstrate **end-to-end product
thinking**: not just a UI wrapped around a market-data API, but a
reasoned system with configurable risk profiles, historical validation
(backtesting), and honest, documented assumptions — the kind of judgment
calls a real analytical tool has to make.

## ✨ Features

### 📈 Multi-Asset Analysis Engine
- **Setup Detection** for Crypto (Spot & Perpetual), US/IDX stocks,
  Forex, and Gold — bias, confidence score, entry zone, stop loss, and
  take-profit levels, all from one shared engine.
- **Trading Style Profiles** — Scalping / Day / Swing / Position Trading,
  each with its own timeframe defaults and risk parameters, instead of a
  one-size-fits-all formula.
- **Trend & Range Detection** — ADX-based trend strength, and genuine
  range/consolidation detection with mean-reversion (fade-the-edges)
  entry logic when the market isn't trending.
- **Breakout Detection** — flags volatility compression *before* a
  breakout, and a stronger "Breakout Setup" signal when a confirmed
  breakout follows that compression.
- **Market Scanner** — heatmap overview of your entire watchlist across
  every asset class at once, color-coded by bias and confidence.

### 🧪 Validation & Risk Tools
- **Backtesting** — simulates each setup's historical signals with the
  exact same live engine; reports win rate, average R, and an equity
  curve. Simplifying assumptions are documented transparently, not
  hidden.
- **Trade Journal** — log real trades, track win rate, average R, and
  win/loss streaks over time.
- **Position Sizing Calculator** — turns your account balance and risk
  tolerance into a concrete position size and required margin.

### 🤖 AI-Powered
- **Context-aware AI Chat** — aware of every setup currently on your
  screen, across all asset classes simultaneously; answers questions
  using the real numbers, not guesses.
- **Auto-Commentary** — short, automatically generated analysis per
  setup, explaining the *why* behind the numbers.
- **Bring Your Own Key (BYOK)** — supports several free-tier providers
  (Groq, Google Gemini, Cerebras, OpenRouter) alongside Anthropic/OpenAI,
  so running the AI features costs nothing.

### ⚡ Productivity
- **Command Palette** (`Cmd/Ctrl + K`) — instant search across your
  entire watchlist.
- **Confidence Breakdown Chart** — visual, transparent breakdown of
  exactly how each confidence score was calculated.
- **Light/Dark theme**, responsive layout.

## 🖼️ Screenshots

<div align="center">
<em>Add a screenshot or short GIF of the dashboard here — e.g. the Market
Scanner heatmap or a Setup Detection panel with the equity curve open.
A visual is worth more than this placeholder.</em>
</div>

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router) + TypeScript |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| Charts | [Recharts](https://recharts.org), custom canvas candlestick chart |
| Market Data | Binance public REST API (crypto), Yahoo Finance / Twelve Data / Finnhub (stocks, forex, gold) |
| AI | BYOK relay — Anthropic, OpenAI, and OpenAI-compatible providers |
| Deployment | [Vercel](https://vercel.com) |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18.18 or newer
- npm (comes with Node.js)

### Installation

```bash
git clone https://github.com/Tama260/trading-dashboard.git
cd trading-dashboard
npm install
```

### Environment Variables

Copy the example file and fill in your own **free** API keys:

```bash
cp .env.example .env.local
```

| Variable | Required for | Get it from |
|---|---|---|
| `TWELVE_DATA_API_KEY` | US stocks & gold (fallback source) | [twelvedata.com](https://twelvedata.com) — free tier |
| `FINNHUB_API_KEY` | US stocks (primary source, higher rate limit) | [finnhub.io](https://finnhub.io) — free tier |

Crypto and Indonesian stock data work with **no API key required** (public
endpoints). AI features need a provider API key, entered directly in the
app's AI Chat settings — stored only in your browser, never sent anywhere
except that provider's own API.

### Running the App

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

> **Windows users:** if `next dev` (Turbopack) is unstable on your
> machine, use `npm run dev:webpack` instead, or double-click
> `start-dev.bat` in the project root.

To build for production:

```bash
npm run build
npm start
```

## 📖 How to Use

1. **Pick your assets** — the dashboard ships with a default watchlist
   for Crypto, Saham (stocks), and Forex; add or remove symbols freely.
2. **Choose a Trading Style** (Scalping / Day / Swing / Position) on any
   Setup Detection panel — this adjusts the timeframe and risk
   parameters used for that analysis.
3. **Read the Setup Detection panel** — bias, confidence, entry zone,
   stop loss, TP1/TP2, and *why* (checklist + confidence breakdown
   chart).
4. **Check the Market Scanner** at the top of the page for a heatmap
   overview of everything on your watchlist at once.
5. **Backtest before you trust it** — expand the 🧪 Backtesting panel on
   any setup to see how similar signals performed historically.
6. **Size your position** — use the 🧮 Position Sizing Calculator with
   your account balance and risk tolerance.
7. **Log real trades** — click "📓 Log Trade Ini ke Journal" to save a
   setup into your Trade Journal and track your actual performance over
   time.
8. **Ask the AI** — open the chat (bottom-right) for questions about
   anything currently on your screen, across every asset class at once.

## 📁 Project Structure

```
src/
├── app/
│   ├── api/          # Server routes: setup detection, backtest, klines, AI relay
│   └── page.tsx       # Main dashboard page
├── components/         # UI components (panels, charts, scanner, journal, etc.)
└── lib/                # Core rule-based engine (setup detection, SMC, indicators, backtest)
```

## 📄 Documentation

Development planning notes and feature write-ups live in
[`/docs`](./docs) — kept for anyone curious about the process behind the
build (not required reading to use the app).

## 👤 Author

**Daffa Novendra Aditama**
AI Automation Engineer

[Portfolio](https://s.id/Portofolio-Daffa_Novendra_Aditama) ·
[GitHub](https://github.com/Tama260)

---

<div align="center">
<sub>Built as a portfolio project. Not financial advice. Always DYOR.</sub>
</div>

"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type AssetCategory = "crypto" | "saham" | "forex" | "emas";

export type AnalysisContext = {
  symbol: string;
  // Label ramah-manusia soal sumber data spesifiknya, misal "Perpetual",
  // "Spot", "Saham IDX", "Saham AS", "Forex", "Emas" — supaya AI bisa
  // bilang "BTCUSDT (Perpetual)" bukan cuma "BTCUSDT" polos.
  marketLabel: string;
  bias: string;
  confidence: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  // "Trending" | "Ranging" — penting buat AI ngerti KENAPA entry-nya
  // berbentuk begitu (fade tepi range vs ikut breakout/trend)
  regime: string;
  trendStrength: number;
  range: { high: number; low: number } | null;
};

type ContextMap = Partial<Record<AssetCategory, AnalysisContext>>;

type ContextValue = {
  contexts: ContextMap;
  setContext: (category: AssetCategory, ctx: AnalysisContext | undefined) => void;
};

const AnalysisContextCtx = createContext<ContextValue | null>(null);

// Provider ini membungkus seluruh halaman. Setiap panel setup-detection
// (crypto/saham/forex) "mendorong" context analisisnya SENDIRI ke sini
// setiap kali data berubah — key-nya per kategori aset, BUKAN satu slot
// global — supaya kalau user lagi buka watchlist Perpetual, Saham, dan
// Forex sekaligus di halaman yang sama, FloatingAIChat tetap tahu ketiganya
// tanpa yang satu menimpa yang lain.
export function AnalysisContextProvider({ children }: { children: ReactNode }) {
  const [contexts, setContexts] = useState<ContextMap>({});

  // WAJIB useCallback dengan deps kosong — setContexts (setter dari useState)
  // sudah stabil dari React sendiri, jadi setContext ini juga jadi stabil
  // lintas render. Ini penting karena dipakai di dependency array useEffect
  // di TradeSetupPanel: kalau referensinya berubah tiap render, effect itu
  // akan terus-menerus dianggap "berubah" dan jalan lagi tanpa henti.
  const setContext = useCallback(
    (category: AssetCategory, ctx: AnalysisContext | undefined) => {
      setContexts((prev) => ({ ...prev, [category]: ctx }));
    },
    []
  );

  return (
    <AnalysisContextCtx.Provider value={{ contexts, setContext }}>
      {children}
    </AnalysisContextCtx.Provider>
  );
}

export function useAnalysisContext() {
  const ctx = useContext(AnalysisContextCtx);
  if (!ctx) {
    throw new Error(
      "useAnalysisContext harus dipakai di dalam AnalysisContextProvider"
    );
  }
  return ctx;
}

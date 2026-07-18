"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type AnalysisContext = {
  symbol: string;
  bias: string;
  confidence: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
};

type ContextValue = {
  context: AnalysisContext | undefined;
  setContext: (ctx: AnalysisContext | undefined) => void;
};

const AnalysisContextCtx = createContext<ContextValue | null>(null);

// Provider ini membungkus seluruh halaman. TradeSetupPanel "mendorong"
// context analisis terbaru ke sini setiap kali data setup berubah, dan
// FloatingAIChat (yang posisinya global, bukan nempel di panel manapun)
// membaca context ini supaya tetap tahu "lagi analisis symbol apa" tanpa
// perlu prop-drilling lewat banyak level komponen.
export function AnalysisContextProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<AnalysisContext | undefined>(undefined);

  return (
    <AnalysisContextCtx.Provider value={{ context, setContext }}>
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

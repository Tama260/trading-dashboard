"use client";

import { useEffect, useRef } from "react";

type TradingViewChartProps = {
  symbol: string; // contoh: "BINANCE:SOLUSDT" atau "NASDAQ:AAPL" untuk saham
};

// TradingView tidak menyediakan tipe TypeScript resmi untuk widget-nya,
// jadi kita deklarasikan sendiri bentuk minimal yang kita pakai.
interface TradingViewWidgetOptions {
  autosize: boolean;
  symbol: string;
  interval: string;
  timezone: string;
  theme: string;
  style: string;
  locale: string;
  toolbar_bg: string;
  enable_publishing: boolean;
  allow_symbol_change: boolean;
  container_id: string;
}

interface TradingViewGlobal {
  widget: new (options: TradingViewWidgetOptions) => unknown;
}

declare global {
  interface Window {
    TradingView?: TradingViewGlobal;
  }
}

export default function TradingViewChart({ symbol }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // ID unik per symbol, supaya kalau nanti ada beberapa chart di satu halaman
  // tidak saling bentrok
  const containerId = `tv_chart_${symbol.replace(/[^a-zA-Z0-9]/g, "_")}`;

  useEffect(() => {
    const scriptId = "tradingview-widget-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    function createWidget() {
      if (window.TradingView && containerRef.current) {
        containerRef.current.innerHTML = "";
        new window.TradingView.widget({
          autosize: true,
          symbol,
          interval: "60",
          timezone: "Asia/Jakarta",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#0a0a0a",
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: containerId,
        });
      }
    }

    // Script TradingView cuma perlu dimuat sekali untuk seluruh halaman
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = createWidget;
      document.body.appendChild(script);
    } else {
      createWidget();
    }
  }, [symbol, containerId]);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-2 h-[500px]">
      <div id={containerId} ref={containerRef} className="w-full h-full" />
    </div>
  );
}

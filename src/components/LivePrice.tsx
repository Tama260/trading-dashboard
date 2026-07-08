"use client";

import { useEffect, useState } from "react";

type LivePriceProps = {
  symbol: string; // contoh: "btcusdt" (huruf kecil, format Binance)
};

type TickerData = {
  price: string;
  changePercent: string;
  high: string;
  low: string;
};

// Komponen ini "hidup sendiri": begitu di-render, dia langsung buka koneksi
// WebSocket ke Binance dan update angka realtime tanpa refresh halaman.
export default function LivePrice({ symbol }: LivePriceProps) {
  const [data, setData] = useState<TickerData | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "error">(
    "connecting"
  );

  useEffect(() => {
    // Binance punya stream publik gratis, tanpa API key, tanpa login.
    // Format: wss://stream.binance.com:9443/ws/<symbol>@ticker
    const streamName = `${symbol.toLowerCase()}@ticker`;
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streamName}`);

    ws.onopen = () => setStatus("live");

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      // "c" = current price, "P" = percent change 24h, "h"/"l" = high/low 24h
      // (nama field ini ditentukan oleh Binance, bisa dicek di dokumentasi resminya)
      setData({
        price: parseFloat(msg.c).toFixed(2),
        changePercent: parseFloat(msg.P).toFixed(2),
        high: parseFloat(msg.h).toFixed(2),
        low: parseFloat(msg.l).toFixed(2),
      });
    };

    ws.onerror = () => setStatus("error");
    ws.onclose = () => setStatus("error");

    // Wajib: tutup koneksi saat komponen di-unmount, supaya tidak bocor memori
    return () => ws.close();
  }, [symbol]);

  const isUp = data ? parseFloat(data.changePercent) >= 0 : true;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-400 uppercase tracking-wide">
          {symbol.replace("usdt", "").toUpperCase()} / USDT
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            status === "live"
              ? "bg-green-900 text-green-400"
              : status === "connecting"
              ? "bg-yellow-900 text-yellow-400"
              : "bg-red-900 text-red-400"
          }`}
        >
          {status === "live"
            ? "● LIVE"
            : status === "connecting"
            ? "Connecting..."
            : "Disconnected"}
        </span>
      </div>

      {data ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-white">
              ${data.price}
            </span>
            <span
              className={`text-sm font-medium ${
                isUp ? "text-green-400" : "text-red-400"
              }`}
            >
              {isUp ? "▲" : "▼"} {data.changePercent}%
            </span>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-neutral-500">
            <span>
              24H High: <span className="text-neutral-300">${data.high}</span>
            </span>
            <span>
              24H Low: <span className="text-neutral-300">${data.low}</span>
            </span>
          </div>
        </>
      ) : (
        <div className="text-neutral-500 text-sm">Menunggu data...</div>
      )}
    </div>
  );
}

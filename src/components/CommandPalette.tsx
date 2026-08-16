"use client";

import { useEffect, useRef, useState } from "react";
import { loadAllWatchlistEntries, WatchlistEntry } from "@/lib/watchlistStorage";

const CATEGORY_ICON: Record<string, string> = {
  crypto: "₿",
  saham: "📈",
  forex: "💱",
  emas: "🪙",
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Buka/tutup pakai Cmd+K (Mac) atau Ctrl+K (Windows/Linux) — dari mana
  // pun user lagi berada di halaman, gak perlu scroll ke atas dulu
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setEntries(loadAllWatchlistEntries());
      setQuery("");
      setActiveIndex(0);
      // Delay dikit biar modal udah kerender dulu sebelum di-fokus
      setTimeout(() => inputRef.current?.focus(), 30);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = entries.filter((e) =>
    (e.label + e.symbol).toLowerCase().includes(query.toLowerCase())
  );

  function select(entry: WatchlistEntry) {
    setOpen(false);
    // MarketScanner yang nanganin expand+scroll-nya (dia yang paling tau
    // posisi & state sel-nya) — command palette ini cuma "ngirim pesan"
    window.dispatchEvent(
      new CustomEvent("scanner:expand", {
        detail: { symbol: entry.symbol, market: entry.market },
      })
    );
    document.getElementById("market-scanner")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      select(filtered[activeIndex]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-card-strong)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Cari symbol di watchlist kamu..."
          className="w-full px-4 py-3 text-sm outline-none"
          style={{ background: "transparent", color: "var(--text-primary)" }}
        />
        <div style={{ borderTop: "1px solid var(--border-card)" }}>
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-xs text-center" style={{ color: "var(--text-faint)" }}>
              Gak ada symbol yang cocok.
            </div>
          )}
          <div className="max-h-72 overflow-y-auto">
            {filtered.map((entry, i) => (
              <button
                key={`${entry.symbol}|${entry.market}`}
                onClick={() => select(entry)}
                onMouseEnter={() => setActiveIndex(i)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm"
                style={{
                  background: i === activeIndex ? "var(--bg-page)" : "transparent",
                  color: "var(--text-secondary)",
                }}
              >
                <span>{CATEGORY_ICON[entry.category] ?? "•"}</span>
                <span>{entry.label}</span>
                <span className="text-[10px] ml-auto" style={{ color: "var(--text-faint)" }}>
                  {entry.category}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div
          className="px-4 py-2 text-[10px] flex items-center gap-3"
          style={{ borderTop: "1px solid var(--border-card)", color: "var(--text-faint)" }}
        >
          <span>↑↓ pilih</span>
          <span>↵ buka</span>
          <span>esc tutup</span>
          <span className="ml-auto">⌘K / Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}

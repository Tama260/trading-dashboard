"use client";

import { useEffect, useState } from "react";
import NewsFeed from "./NewsFeed";

// Sengaja dibuat persis meniru pola FloatingAIChat (bubble bottom-6,
// panel bottom-24) tapi di sisi KIRI — supaya bahasa visualnya konsisten
// (2 widget ngambang, kiri & kanan) dan tidak saling menutupi.
export default function FloatingNews() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed bottom-24 left-6 z-50 w-[94vw] max-w-lg rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-card-strong)",
            maxHeight: "min(80vh, 760px)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor: "var(--border-card)" }}
          >
            <span className="text-base font-semibold text-[var(--text-primary)]">
              📰 Berita Market
            </span>
            <button
              onClick={() => setIsOpen(false)}
              title="Tutup"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-card-secondary)] text-lg"
            >
              ✕
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-4">
            <NewsFeed />
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        title={isOpen ? "Tutup Berita" : "Buka Berita"}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl transition-transform hover:scale-105"
        style={{
          backgroundColor: "var(--badge-sky-bg)",
          color: "var(--badge-sky-text)",
        }}
      >
        {isOpen ? "✕" : "📰"}
      </button>
    </>
  );
}

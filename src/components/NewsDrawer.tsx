"use client";

import { useEffect, useState } from "react";
import NewsFeed from "./NewsFeed";

export default function NewsDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm px-4 py-2 rounded-md border transition-colors"
        style={{
          backgroundColor: "var(--bg-card-secondary)",
          borderColor: "var(--border-card-strong)",
          color: "var(--text-secondary)",
        }}
      >
        📰 Berita
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setOpen(false)}
          />

          <div
            className="fixed top-0 right-0 h-full w-full sm:w-[480px] z-50 shadow-2xl flex flex-col"
            style={{
              backgroundColor: "var(--bg-page)",
              borderLeft: "1px solid var(--border-card)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor: "var(--border-card)" }}
            >
              <span className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Berita Market
              </span>
              <button
                onClick={() => setOpen(false)}
                title="Tutup"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-card-secondary)]"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-hidden flex-1">
              <NewsFeed />
            </div>
          </div>
        </>
      )}
    </>
  );
}

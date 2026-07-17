"use client";

import { useEffect, useState } from "react";

type NewsItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  snippet: string;
};

const POLL_INTERVAL_MS = 5 * 60 * 1000; // berita tidak perlu se-realtime harga

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  return `${Math.floor(diffHour / 24)} hari lalu`;
}

export default function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [category, setCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function load() {
      try {
        setLoading(true);
        const query = category ? `?category=${category}` : "";
        const res = await fetch(`/api/news${query}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal memuat berita");
        if (!cancelled) {
          setNews(json.news ?? []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(load, POLL_INTERVAL_MS);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [category]);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
          Berita Market
        </span>
        <div className="flex gap-2">
          {[
            { value: "", label: "Semua" },
            { value: "crypto", label: "Crypto" },
            { value: "market", label: "Market" },
          ].map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className="text-xs px-3 py-1 rounded-full border transition-colors"
              style={
                category === c.value
                  ? {
                      backgroundColor: "var(--badge-sky-bg)",
                      color: "var(--badge-sky-text)",
                      borderColor: "var(--badge-sky-text)",
                    }
                  : {
                      backgroundColor: "transparent",
                      color: "var(--text-muted)",
                      borderColor: "var(--border-card-strong)",
                    }
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] divide-y divide-[var(--border-card)]">
        {loading && news.length === 0 && (
          <div className="p-4 text-sm text-[var(--text-muted)]">
            Memuat berita...
          </div>
        )}
        {error && (
          <div className="p-4 text-sm text-[var(--badge-red-text)]">
            {error}
          </div>
        )}
        {!loading && !error && news.length === 0 && (
          <div className="p-4 text-sm text-[var(--text-muted)]">
            Tidak ada berita tersedia saat ini.
          </div>
        )}

        {news.map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 hover:bg-[var(--bg-card-secondary)] transition-colors"
          >
            <div className="flex items-center gap-2 mb-1 text-xs">
              <span
                className="px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: "var(--bg-card-secondary)",
                  color: "var(--text-tertiary)",
                }}
              >
                {item.source}
              </span>
              <span className="text-[var(--text-faint)]">
                {timeAgo(item.pubDate)}
              </span>
            </div>
            <div className="text-sm text-[var(--text-primary)] font-medium mb-1">
              {item.title}
            </div>
            {item.snippet && (
              <div className="text-xs text-[var(--text-muted)] line-clamp-2">
                {item.snippet}
              </div>
            )}
          </a>
        ))}
      </div>

      <p className="text-[11px] text-[var(--text-faint)] mt-2">
        Sumber: RSS feed resmi (CoinDesk, CoinTelegraph, Decrypt,
        Investing.com). Klik judul untuk baca lengkap di situs aslinya.
      </p>
    </div>
  );
}

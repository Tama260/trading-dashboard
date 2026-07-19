"use client";

import { useEffect, useRef, useState } from "react";
import { useAnalysisContext } from "@/lib/analysisContext";

type ChatMessage = { role: "user" | "assistant"; content: string };

// Preset provider — user tinggal PILIH, tidak perlu tahu/ketik Base URL
// atau nama model secara manual. Cuma "Custom" yang butuh isi manual,
// buat provider lain yang belum ada di daftar ini.
type Preset = {
  id: string;
  label: string;
  provider: "anthropic" | "openai";
  baseUrl: string;
  model: string;
  free: boolean;
  signupUrl: string;
};

const PRESETS: Preset[] = [
  {
    id: "groq",
    label: "Groq",
    provider: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    free: true,
    signupUrl: "console.groq.com",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    provider: "openai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    model: "gemini-2.0-flash",
    free: true,
    signupUrl: "aistudio.google.com",
  },
  {
    id: "cerebras",
    label: "Cerebras",
    provider: "openai",
    baseUrl: "https://api.cerebras.ai/v1",
    model: "llama-3.3-70b",
    free: true,
    signupUrl: "cloud.cerebras.ai",
  },
  {
    id: "openrouter",
    label: "OpenRouter (model gratis terbatas)",
    provider: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    free: true,
    signupUrl: "openrouter.ai",
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude) — berbayar",
    provider: "anthropic",
    baseUrl: "",
    model: "claude-3-5-haiku-20241022",
    free: false,
    signupUrl: "console.anthropic.com",
  },
  {
    id: "openai",
    label: "OpenAI — berbayar",
    provider: "openai",
    baseUrl: "",
    model: "gpt-4o-mini",
    free: false,
    signupUrl: "platform.openai.com",
  },
  {
    id: "custom",
    label: "Custom (isi manual)",
    provider: "openai",
    baseUrl: "",
    model: "",
    free: false,
    signupUrl: "",
  },
];

type Settings = {
  presetId: string;
  apiKey: string;
  // Cuma dipakai kalau presetId === "custom"
  customProvider: "anthropic" | "openai";
  customBaseUrl: string;
  customModel: string;
};

const STORAGE_KEY = "trading-dashboard-ai-settings";

const DEFAULT_SETTINGS: Settings = {
  presetId: "groq",
  apiKey: "",
  customProvider: "openai",
  customBaseUrl: "",
  customModel: "",
};

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage penuh/diblokir — tidak fatal
  }
}

// Gabungkan preset terpilih jadi 1 objek {provider, baseUrl, model} yang
// siap dikirim ke server — baik dari preset siap pakai maupun custom manual
function resolveActiveConfig(settings: Settings): {
  provider: "anthropic" | "openai";
  baseUrl: string;
  model: string;
} {
  if (settings.presetId === "custom") {
    return {
      provider: settings.customProvider,
      baseUrl: settings.customBaseUrl,
      model: settings.customModel,
    };
  }
  const preset = PRESETS.find((p) => p.id === settings.presetId) ?? PRESETS[0];
  return { provider: preset.provider, baseUrl: preset.baseUrl, model: preset.model };
}

function buildSystemPrompt(context?: ReturnType<typeof useAnalysisContext>["context"]): string {
  const base =
    "Kamu adalah asisten analisis trading untuk dashboard rule-based (bukan machine learning). " +
    "Jawab singkat, jelas, dalam Bahasa Indonesia. Kamu BOLEH dan DIHARAPKAN menjawab pertanyaan " +
    "soal coin/saham/aset APAPUN pakai pengetahuan umum kamu sendiri, tidak terbatas cuma pada " +
    "konteks yang diberikan di bawah — konteks itu cuma info TAMBAHAN soal apa yang SEDANG " +
    "ditampilkan di layar user, bukan pembatas topik obrolan. WAJIB selalu ingatkan bahwa ini bukan " +
    "nasihat keuangan dan bukan jaminan profit — dorong user untuk tetap DYOR (Do Your Own Research) " +
    "dan pakai manajemen risiko. JANGAN pernah menjanjikan hasil pasti.";

  if (!context) return base;

  return `${base}

Data rule-based yang tersedia saat ini (dari dashboard, bisa jadi yang lagi tampil di layar ATAU
yang baru diambil live karena user menyebut symbol ini di chat): symbol ${context.symbol}, bias
${context.bias} (confidence ${context.confidence}%), entry zone ${context.entryLow}-${context.entryHigh},
SL ${context.stopLoss}, TP1 ${context.tp1}, TP2 ${context.tp2}. Kalau user tanya soal angka-angka
symbol ini, jawab pakai data ini. Kalau user tanya soal coin/topik LAIN, tetap jawab pakai
pengetahuan umum kamu — JANGAN bilang "saya tidak punya info" hanya karena tidak ada di sini.`;
}

// Kata umum yang sering ke-deteksi salah sebagai "symbol" — perlu di-skip
// supaya tidak salah nembak coin yang tidak ada
const COMMON_WORDS = new Set([
  "INI", "ITU", "DAN", "YANG", "SAJA", "UNTUK", "DARI", "SOAL", "APA",
  "KOK", "BOT", "TOLONG", "COBA", "GIMANA", "KENAPA", "BAGAIMANA", "AI",
  "SAYA", "KAMU", "DIA", "MEREKA", "ADA", "TIDAK", "BISA", "MAU", "SUDAH",
  "BELUM", "AKAN", "SEDANG", "HARGA", "CHART", "SETUP", "ANALISIS",
  "ANALISA", "ENTRY", "EXIT", "PROFIT", "LOSS", "TREND", "TP", "SL",
]);

// Coba tebak nama symbol crypto yang disebut user di pesan chat (misal
// "analisis HYPE dong" atau "gimana SOLUSDT sekarang" -> "HYPEUSDT",
// "SOLUSDT"). Ini heuristik sederhana (bukan NLP canggih), jadi bisa
// meleset untuk kalimat yang aneh, tapi cukup untuk kasus umum.
function guessSymbolFromText(text: string): string | null {
  const cleaned = text.toUpperCase().replace(/PERPETUAL|PERP/g, "");
  const words = cleaned.match(/[A-Z]{2,10}/g) ?? [];

  for (const word of words) {
    if (COMMON_WORDS.has(word)) continue;
    // Kalau user sudah sebut lengkap dengan USDT (misal "HYPEUSDT"), pakai
    // langsung. Kalau cuma nama coin-nya (misal "HYPE"), tambahkan USDT.
    return word.endsWith("USDT") ? word : `${word}USDT`;
  }
  return null;
}

type LiveContext = {
  symbol: string;
  bias: string;
  confidence: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
};

// Ambil data setup detection LIVE untuk symbol yang disebut user di chat —
// dipanggil sebelum kirim ke AI, supaya AI tidak "buta" kalau ditanya soal
// coin lain di luar yang lagi tampil di dropdown "Analisis Untuk"
async function fetchLiveContextForSymbol(
  symbol: string
): Promise<LiveContext | null> {
  try {
    const res = await fetch(`/api/setup?symbol=${symbol}&interval=1h`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return null;

    return {
      symbol,
      bias: json.bias,
      confidence: json.confidence,
      entryLow: json.levels.entryLow,
      entryHigh: json.levels.entryHigh,
      stopLoss: json.levels.stopLoss,
      tp1: json.levels.tp1,
      tp2: json.levels.tp2,
    };
  } catch {
    return null;
  }
}

export default function FloatingAIChat() {
  const { context } = useAnalysisContext();
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (isOpen) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading, isOpen]);

  function updateSettings(patch: Partial<Settings>) {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    saveSettings(updated);
  }

  const activePreset = PRESETS.find((p) => p.id === settings.presetId) ?? PRESETS[0];
  const isCustom = settings.presetId === "custom";

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    if (!settings.apiKey) {
      setError("Isi API key kamu dulu di Pengaturan (ikon ⚙) sebelum chat.");
      setShowSettings(true);
      return;
    }

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      // Kalau user menyebut symbol lain (misal "HYPEUSDT") yang beda dari
      // yang lagi ditampilkan di dashboard, coba ambil data live-nya dulu —
      // supaya AI jawab pakai data asli, bukan cuma pengetahuan umum
      let effectiveContext = context;
      const mentionedSymbol = guessSymbolFromText(text);
      if (mentionedSymbol && mentionedSymbol !== context?.symbol) {
        const liveData = await fetchLiveContextForSymbol(mentionedSymbol);
        if (liveData) effectiveContext = liveData;
      }

      const config = resolveActiveConfig(settings);
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: config.provider,
          apiKey: settings.apiKey,
          model: config.model,
          baseUrl: config.baseUrl,
          messages: [
            { role: "system", content: buildSystemPrompt(effectiveContext) },
            ...newMessages,
          ],
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mendapat balasan");

      setMessages((prev) => [...prev, { role: "assistant", content: json.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated) return null;

  return (
    <>
      {/* Panel chat — diperbesar (lebar & tinggi) supaya lebih nyaman dibaca */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[94vw] max-w-lg rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-card)",
            maxHeight: "min(80vh, 760px)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 border-b flex-shrink-0"
            style={{ borderColor: "var(--border-card)" }}
          >
            <div>
              <div className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                AI Chat {context ? `— ${context.symbol}` : ""}
              </div>
              <div className="text-xs" style={{ color: "var(--text-faint)" }}>
                BYOK — key tersimpan di browser kamu
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings((v) => !v)}
                title="Pengaturan"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-card-secondary)] text-lg"
              >
                ⚙
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Tutup"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-card-secondary)] text-lg"
              >
                ✕
              </button>
            </div>
          </div>

          {showSettings && (
            <div
              className="p-4 border-b space-y-3 flex-shrink-0 overflow-y-auto"
              style={{ borderColor: "var(--border-card)", backgroundColor: "var(--bg-card-secondary)", maxHeight: "55vh" }}
            >
              <div>
                <label className="text-sm block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Provider
                </label>
                <select
                  value={settings.presetId}
                  onChange={(e) => updateSettings({ presetId: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-base"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-card-strong)",
                    color: "var(--text-primary)",
                  }}
                >
                  <optgroup label="Gratis, tanpa kartu kredit">
                    {PRESETS.filter((p) => p.free).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Berbayar">
                    {PRESETS.filter((p) => !p.free && p.id !== "custom").map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Lainnya">
                    <option value="custom">Custom (isi manual)</option>
                  </optgroup>
                </select>
              </div>

              {!isCustom && activePreset.free && (
                <div
                  className="text-xs p-2.5 rounded"
                  style={{
                    backgroundColor: "var(--badge-green-bg)",
                    color: "var(--badge-green-text)",
                  }}
                >
                  💡 Gratis, tanpa kartu kredit. Daftar API key di{" "}
                  <strong>{activePreset.signupUrl}</strong>, lalu tempel di
                  bawah. Model dan alamat server sudah otomatis diatur.
                </div>
              )}
              {!isCustom && !activePreset.free && (
                <div
                  className="text-xs p-2.5 rounded"
                  style={{
                    backgroundColor: "var(--badge-yellow-bg)",
                    color: "var(--badge-yellow-text)",
                  }}
                >
                  ⚠ Provider ini berbayar (kadang ada kredit trial di awal).
                  Ambil key di <strong>{activePreset.signupUrl}</strong>.
                </div>
              )}

              {isCustom && (
                <>
                  <div>
                    <label className="text-sm block mb-1.5" style={{ color: "var(--text-muted)" }}>
                      Format API
                    </label>
                    <select
                      value={settings.customProvider}
                      onChange={(e) =>
                        updateSettings({ customProvider: e.target.value as "anthropic" | "openai" })
                      }
                      className="w-full border rounded-md px-3 py-2 text-base"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        borderColor: "var(--border-card-strong)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <option value="openai">OpenAI-compatible</option>
                      <option value="anthropic">Anthropic-compatible</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm block mb-1.5" style={{ color: "var(--text-muted)" }}>
                      Base URL
                    </label>
                    <input
                      value={settings.customBaseUrl}
                      onChange={(e) => updateSettings({ customBaseUrl: e.target.value })}
                      placeholder="https://api.contoh.com/v1"
                      className="w-full border rounded-md px-3 py-2 text-base"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        borderColor: "var(--border-card-strong)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm block mb-1.5" style={{ color: "var(--text-muted)" }}>
                      Model
                    </label>
                    <input
                      value={settings.customModel}
                      onChange={(e) => updateSettings({ customModel: e.target.value })}
                      placeholder="nama-model"
                      className="w-full border rounded-md px-3 py-2 text-base"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        borderColor: "var(--border-card-strong)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-sm block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => updateSettings({ apiKey: e.target.value })}
                  placeholder="Tempel API key kamu di sini"
                  className="w-full border rounded-md px-3 py-2 text-base"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-card-strong)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="overflow-y-auto flex-1 p-4 space-y-3 min-h-[240px]">
            {messages.length === 0 && (
              <div className="text-base text-center py-8" style={{ color: "var(--text-muted)" }}>
                {context
                  ? `Lagi lihat analisis ${context.symbol}. Tanya soal itu, atau coin/topik lain juga boleh.`
                  : "Mulai obrolan — tanya apa saja soal trading."}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] rounded-lg px-4 py-2.5 text-base whitespace-pre-wrap leading-relaxed"
                  style={
                    m.role === "user"
                      ? { backgroundColor: "var(--badge-sky-bg)", color: "var(--badge-sky-text)" }
                      : { backgroundColor: "var(--bg-card-secondary)", color: "var(--text-secondary)" }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-base" style={{ color: "var(--text-muted)" }}>
                Mengetik...
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm px-4 pb-2 flex-shrink-0" style={{ color: "var(--badge-red-text)" }}>
              {error}
            </div>
          )}

          <form onSubmit={sendMessage} className="flex gap-2 p-3 border-t flex-shrink-0" style={{ borderColor: "var(--border-card)" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya soal setup ini..."
              className="flex-1 border rounded-md px-4 py-2.5 text-base"
              style={{
                backgroundColor: "var(--bg-card-secondary)",
                borderColor: "var(--border-card-strong)",
                color: "var(--text-primary)",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              className="text-base px-5 py-2.5 rounded-md bg-sky-600 text-white hover:bg-sky-500 transition-colors disabled:opacity-50"
            >
              Kirim
            </button>
          </form>
        </div>
      )}

      {/* Bubble tombol — selalu terlihat */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl transition-transform hover:scale-105"
        style={{ backgroundColor: "var(--badge-sky-bg)", color: "var(--badge-sky-text)" }}
        title="AI Chat"
      >
        {isOpen ? "✕" : "💬"}
      </button>
    </>
  );
}

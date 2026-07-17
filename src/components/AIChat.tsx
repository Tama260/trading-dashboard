"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

type AnalysisContext = {
  symbol: string;
  bias: string;
  confidence: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
};

type Settings = {
  provider: "anthropic" | "openai";
  apiKey: string;
  model: string;
  baseUrl: string;
};

const STORAGE_KEY = "trading-dashboard-ai-settings";

const DEFAULT_SETTINGS: Settings = {
  provider: "anthropic",
  apiKey: "",
  model: "claude-3-5-haiku-20241022",
  baseUrl: "",
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

function buildSystemPrompt(context?: AnalysisContext): string {
  const base =
    "Kamu adalah asisten analisis trading untuk dashboard rule-based (bukan machine learning). " +
    "Jawab singkat, jelas, dalam Bahasa Indonesia. WAJIB selalu ingatkan bahwa ini bukan nasihat " +
    "keuangan dan bukan jaminan profit — dorong user untuk tetap DYOR (Do Your Own Research) dan " +
    "pakai manajemen risiko. JANGAN pernah menjanjikan hasil pasti.";

  if (!context) return base;

  return `${base}

Konteks analisis yang SEDANG ditampilkan ke user:
- Symbol: ${context.symbol}
- Bias/Setup: ${context.bias} (confidence ${context.confidence}%)
- Entry Zone: ${context.entryLow} - ${context.entryHigh}
- Stop Loss: ${context.stopLoss}
- TP1: ${context.tp1}, TP2: ${context.tp2}

User mungkin bertanya soal angka-angka di atas. Jawab berdasarkan konteks ini kalau relevan.`;
}

export default function AIChat({ context }: { context?: AnalysisContext }) {
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
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  function updateSettings(patch: Partial<Settings>) {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    saveSettings(updated);
  }

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
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.provider,
          apiKey: settings.apiKey,
          model: settings.model,
          baseUrl: settings.baseUrl,
          messages: [
            { role: "system", content: buildSystemPrompt(context) },
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
    <div className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
            AI Chat {context ? `— ${context.symbol}` : ""}
          </span>
          <p className="text-[11px] text-[var(--text-faint)] mt-0.5">
            Pakai API key kamu sendiri (BYOK) — tersimpan di browser, bukan di server kami
          </p>
        </div>
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-md bg-[var(--bg-card-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-tertiary)] transition-colors"
        >
          ⚙ Pengaturan
        </button>
      </div>

      {showSettings && (
        <div className="mb-4 p-4 rounded-lg bg-[var(--bg-card-secondary)]/50 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">
                Provider
              </label>
              <select
                value={settings.provider}
                onChange={(e) =>
                  updateSettings({
                    provider: e.target.value as "anthropic" | "openai",
                  })
                }
                className="w-full bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">
                  OpenAI-compatible (OpenAI, DeepSeek, Groq, dll)
                </option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">
                Model
              </label>
              <input
                value={settings.model}
                onChange={(e) => updateSettings({ model: e.target.value })}
                placeholder={
                  settings.provider === "anthropic"
                    ? "claude-3-5-haiku-20241022"
                    : "gpt-4o-mini"
                }
                className="w-full bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
              />
            </div>
          </div>

          {settings.provider === "openai" && (
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">
                Base URL (opsional — kosongkan untuk OpenAI resmi, isi untuk
                DeepSeek/Groq/dll)
              </label>
              <input
                value={settings.baseUrl}
                onChange={(e) => updateSettings({ baseUrl: e.target.value })}
                placeholder="https://api.deepseek.com/v1"
                className="w-full bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">
              API Key
            </label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => updateSettings({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full bg-[var(--bg-card)] border border-[var(--border-card-strong)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
            />
            <p className="text-[10px] text-[var(--text-faint)] mt-1">
              Cuma tersimpan di localStorage browser kamu. Tiap pesan dikirim ke
              server kami sekali lewat (relay), tidak pernah disimpan/di-log.
            </p>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto mb-3 space-y-3 pr-1"
      >
        {messages.length === 0 && (
          <div className="text-sm text-[var(--text-muted)] text-center py-8">
            {context
              ? `Tanya apa saja soal analisis ${context.symbol} yang lagi ditampilkan.`
              : "Mulai obrolan — tanya apa saja soal trading."}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
              style={
                m.role === "user"
                  ? {
                      backgroundColor: "var(--badge-sky-bg)",
                      color: "var(--badge-sky-text)",
                    }
                  : {
                      backgroundColor: "var(--bg-card-secondary)",
                      color: "var(--text-secondary)",
                    }
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-sm text-[var(--text-muted)]">Mengetik...</div>
        )}
      </div>

      {error && (
        <div className="text-xs text-[var(--badge-red-text)] mb-2">{error}</div>
      )}

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanya soal setup ini..."
          className="flex-1 bg-[var(--bg-card-secondary)] border border-[var(--border-card-strong)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)]"
        />
        <button
          type="submit"
          disabled={loading}
          className="text-sm px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-500 transition-colors disabled:opacity-50"
        >
          Kirim
        </button>
      </form>
    </div>
  );
}

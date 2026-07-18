"use client";

import { useEffect, useRef, useState } from "react";
import { useAnalysisContext } from "@/lib/analysisContext";

type ChatMessage = { role: "user" | "assistant"; content: string };

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

function buildSystemPrompt(context?: ReturnType<typeof useAnalysisContext>["context"]): string {
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
    <>
      {/* Panel chat — cuma muncul kalau isOpen */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[92vw] max-w-sm rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-card)",
            maxHeight: "min(70vh, 600px)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 border-b flex-shrink-0"
            style={{ borderColor: "var(--border-card)" }}
          >
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                AI Chat {context ? `— ${context.symbol}` : ""}
              </div>
              <div className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                BYOK — key tersimpan di browser kamu
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings((v) => !v)}
                title="Pengaturan"
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--bg-card-secondary)] text-sm"
              >
                ⚙
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Tutup"
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--bg-card-secondary)] text-sm"
              >
                ✕
              </button>
            </div>
          </div>

          {showSettings && (
            <div
              className="p-4 border-b space-y-3 flex-shrink-0 overflow-y-auto"
              style={{ borderColor: "var(--border-card)", backgroundColor: "var(--bg-card-secondary)", maxHeight: "50vh" }}
            >
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                  Provider
                </label>
                <select
                  value={settings.provider}
                  onChange={(e) =>
                    updateSettings({ provider: e.target.value as "anthropic" | "openai" })
                  }
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-card-strong)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI-compatible (OpenAI, DeepSeek, Groq)</option>
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
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
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-card-strong)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              {settings.provider === "openai" && (
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                    Base URL (kosongkan untuk OpenAI resmi)
                  </label>
                  <input
                    value={settings.baseUrl}
                    onChange={(e) => updateSettings({ baseUrl: e.target.value })}
                    placeholder="https://api.deepseek.com/v1"
                    className="w-full border rounded px-2 py-1.5 text-sm"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      borderColor: "var(--border-card-strong)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              )}
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => updateSettings({ apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full border rounded px-2 py-1.5 text-sm"
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
          <div ref={scrollRef} className="overflow-y-auto flex-1 p-4 space-y-3 min-h-[200px]">
            {messages.length === 0 && (
              <div className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                {context
                  ? `Tanya apa saja soal analisis ${context.symbol} yang lagi ditampilkan.`
                  : "Mulai obrolan — tanya apa saja soal trading."}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
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
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                Mengetik...
              </div>
            )}
          </div>

          {error && (
            <div className="text-xs px-4 pb-2 flex-shrink-0" style={{ color: "var(--badge-red-text)" }}>
              {error}
            </div>
          )}

          <form onSubmit={sendMessage} className="flex gap-2 p-3 border-t flex-shrink-0" style={{ borderColor: "var(--border-card)" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya soal setup ini..."
              className="flex-1 border rounded-md px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--bg-card-secondary)",
                borderColor: "var(--border-card-strong)",
                color: "var(--text-primary)",
              }}
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

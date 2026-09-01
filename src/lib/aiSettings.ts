// Preset provider — user tinggal PILIH, tidak perlu tahu/ketik Base URL
// atau nama model secara manual. Cuma "Custom" yang butuh isi manual,
// buat provider lain yang belum ada di daftar ini.
//
// Dipakai bareng oleh FloatingAIChat.tsx (chat interaktif) dan
// AISetupCommentary.tsx (komentar otomatis per setup) — SATU sumber
// kebenaran buat provider/API key, supaya user cukup setting sekali di
// chat widget dan otomatis kepakai juga di fitur lain.
export type Preset = {
  id: string;
  label: string;
  provider: "anthropic" | "openai";
  baseUrl: string;
  model: string;
  free: boolean;
  signupUrl: string;
};

export const PRESETS: Preset[] = [
  {
    id: "groq",
    label: "Groq",
    provider: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "openai/gpt-oss-120b",
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
    model: "gpt-oss-120b",
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

export type AISettings = {
  presetId: string;
  apiKey: string;
  // Cuma dipakai kalau presetId === "custom"
  customProvider: "anthropic" | "openai";
  customBaseUrl: string;
  customModel: string;
};

const STORAGE_KEY = "trading-dashboard-ai-settings";

export const DEFAULT_AI_SETTINGS: AISettings = {
  presetId: "groq",
  apiKey: "",
  customProvider: "openai",
  customBaseUrl: "",
  customModel: "",
};

export function loadAISettings(): AISettings {
  if (typeof window === "undefined") return DEFAULT_AI_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) } : DEFAULT_AI_SETTINGS;
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAISettings(settings: AISettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage penuh/diblokir — tidak fatal
  }
}

// Gabungkan preset terpilih jadi 1 objek {provider, baseUrl, model} yang
// siap dikirim ke server — baik dari preset siap pakai maupun custom manual
export function resolveActiveAIConfig(settings: AISettings): {
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

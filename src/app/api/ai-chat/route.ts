import { NextRequest, NextResponse } from "next/server";

// PENTING soal keamanan: route ini HANYA meneruskan (relay) permintaan ke
// provider AI menggunakan API key yang dikirim user di body request.
// Key TIDAK PERNAH disimpan, di-log, atau dipakai untuk request lain — key
// hidup di localStorage browser user, dan cuma "numpang lewat" server ini
// sekali per pesan. Alasan butuh relay (bukan langsung dari browser):
// kebanyakan provider AI (termasuk OpenAI) tidak mengizinkan CORS dari
// browser sembarangan.

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    provider,
    apiKey,
    model,
    messages,
    baseUrl,
  }: {
    provider: "anthropic" | "openai";
    apiKey: string;
    model?: string;
    messages: ChatMessage[];
    baseUrl?: string;
  } = body;

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key wajib diisi" },
      { status: 400 }
    );
  }
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Pesan tidak boleh kosong" },
      { status: 400 }
    );
  }

  try {
    if (provider === "anthropic") {
      const systemMsg = messages.find((m) => m.role === "system")?.content;
      const chatMsgs = messages.filter((m) => m.role !== "system");

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model || "claude-3-5-haiku-20241022",
          max_tokens: 1024,
          system: systemMsg,
          messages: chatMsgs,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error?.message || `Anthropic merespons status ${res.status}`
        );
      }

      const json = await res.json();
      const text =
        json.content
          ?.filter((c: { type: string }) => c.type === "text")
          .map((c: { text: string }) => c.text)
          .join("") ?? "";

      return NextResponse.json({ reply: text });
    } else {
      // OpenAI-compatible (OpenAI, DeepSeek, Groq, dst — semua yang ikut
      // format /chat/completions standar)
      const base = baseUrl?.trim() || "https://api.openai.com/v1";

      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || "gpt-4o-mini",
          messages,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error?.message || `Provider merespons status ${res.status}`
        );
      }

      const json = await res.json();
      const text = json.choices?.[0]?.message?.content ?? "";

      return NextResponse.json({ reply: text });
    }
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal menghubungi provider AI",
      },
      { status: 502 }
    );
  }
}

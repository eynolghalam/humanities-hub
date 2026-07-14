// Server-only helper: call an OpenAI-compatible chat completion with
// automatic fallback across models and providers when credit / rate limits
// are hit. Preserves the same request/response shape as a direct call.

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type AIBody = { model?: string; [k: string]: unknown };

type Endpoint = {
  url: string;
  apiKey: string | undefined;
  model: string;
  label: string;
};

function buildChain(primaryModel: string): Endpoint[] {
  const lovable = process.env.LOVABLE_API_KEY;
  const openrouter = process.env.OPENROUTER_API_KEY;
  const chain: Endpoint[] = [];

  // Primary Lovable model, then progressively cheaper / different Lovable models
  const lovableModels = [
    primaryModel,
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
    "google/gemini-3-flash-preview",
  ].filter((m, i, arr) => arr.indexOf(m) === i);

  for (const m of lovableModels) {
    chain.push({ url: LOVABLE_URL, apiKey: lovable, model: m, label: `lovable:${m}` });
  }

  // Optional free fallbacks via OpenRouter (requires OPENROUTER_API_KEY secret).
  if (openrouter) {
    for (const m of [
      "google/gemini-2.0-flash-exp:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "deepseek/deepseek-chat-v3.1:free",
    ]) {
      chain.push({ url: OPENROUTER_URL, apiKey: openrouter, model: m, label: `openrouter:${m}` });
    }
  }

  return chain;
}

export async function callAIWithFallback(body: AIBody): Promise<any> {
  const primaryModel = body.model ?? "google/gemini-2.5-flash";
  const chain = buildChain(primaryModel);
  if (chain.length === 0) throw new Error("هیچ ارائه‌دهنده هوش مصنوعی پیکربندی نشده است.");

  let lastErr: Error | null = null;
  for (const ep of chain) {
    if (!ep.apiKey) continue;
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${ep.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, model: ep.model }),
      });
      if (res.ok) return await res.json();
      const txt = await res.text().catch(() => "");
      // 429 (rate) / 402 (credit) → try next endpoint. Other errors → try next too, but remember.
      lastErr = new Error(`${ep.label}: ${res.status} ${txt.slice(0, 200)}`);
      if (res.status !== 429 && res.status !== 402 && res.status < 500) {
        // For hard 4xx we still try the next fallback since user asked for automatic continuation.
        continue;
      }
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  const detail = lastErr?.message ?? "unknown";
  if (detail.includes("402")) {
    throw new Error("اعتبار هوش مصنوعی تمام شده و ارائه‌دهنده جایگزین رایگان پیکربندی نشده است. لطفاً کلید OPENROUTER_API_KEY را در تنظیمات اضافه کنید یا اعتبار خرید کنید.");
  }
  if (detail.includes("429")) {
    throw new Error("محدودیت درخواست تمامی ارائه‌دهنده‌ها. کمی بعد دوباره تلاش کنید.");
  }
  throw new Error(`خطای هوش مصنوعی: ${detail}`);
}

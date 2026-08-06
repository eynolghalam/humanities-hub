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

async function buildChain(primaryModel: string): Promise<Endpoint[]> {
  const { loadAiSettings } = await import("./ai-settings.server");
  const settings = await loadAiSettings();

  const lovable = process.env.LOVABLE_API_KEY;
  const openrouter = settings.openrouter_api_key || process.env.OPENROUTER_API_KEY;
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

  // Free fallbacks via OpenRouter (key from admin AI settings or env secret).
  if (openrouter) {
    for (const m of settings.openrouter_models) {
      chain.push({ url: OPENROUTER_URL, apiKey: openrouter, model: m, label: `openrouter:${m}` });
    }
  }

  // Custom OpenAI-compatible provider configured by the admin.
  if (settings.custom_base_url && settings.custom_models.length > 0) {
    const base = settings.custom_base_url.replace(/\/+$/, "");
    const url = base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
    for (const m of settings.custom_models) {
      chain.push({ url, apiKey: settings.custom_api_key ?? "", model: m, label: `custom:${m}` });
    }
  }

  return chain;
}

export async function callAIWithFallback(body: AIBody): Promise<any> {
  const primaryModel = body.model ?? "google/gemini-2.5-flash";
  const chain = await buildChain(primaryModel);
  if (chain.length === 0) throw new Error("هیچ ارائه‌دهنده هوش مصنوعی پیکربندی نشده است.");

  let lastErr: Error | null = null;
  for (const ep of chain) {
    if (ep.apiKey === undefined) continue;
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
    throw new Error("اعتبار هوش مصنوعی تمام شده و ارائه‌دهنده جایگزین رایگان پیکربندی نشده است. لطفاً در تنظیمات هوش مصنوعی یک ارائه‌دهنده رایگان اضافه کنید.");
  }
  if (detail.includes("429")) {
    throw new Error("محدودیت درخواست تمامی ارائه‌دهنده‌ها. کمی بعد دوباره تلاش کنید.");
  }
  throw new Error(`خطای هوش مصنوعی: ${detail}`);
}

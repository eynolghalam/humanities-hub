// Server-only: read AI provider settings configured by admins/owner.

export type AiSettings = {
  openrouter_api_key: string | null;
  openrouter_models: string[];
  custom_base_url: string | null;
  custom_api_key: string | null;
  custom_models: string[];
  google_translate_fallback: boolean;
};

const DEFAULTS: AiSettings = {
  openrouter_api_key: null,
  openrouter_models: [
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-chat-v3.1:free",
  ],
  custom_base_url: null,
  custom_api_key: null,
  custom_models: [],
  google_translate_fallback: true,
};

export async function loadAiSettings(): Promise<AiSettings> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("ai_settings")
      .select("openrouter_api_key,openrouter_models,custom_base_url,custom_api_key,custom_models,google_translate_fallback")
      .eq("id", true)
      .maybeSingle();
    if (!data) return DEFAULTS;
    return {
      openrouter_api_key: data.openrouter_api_key ?? null,
      openrouter_models: data.openrouter_models?.length ? data.openrouter_models : DEFAULTS.openrouter_models,
      custom_base_url: data.custom_base_url ?? null,
      custom_api_key: data.custom_api_key ?? null,
      custom_models: data.custom_models ?? [],
      google_translate_fallback: data.google_translate_fallback ?? true,
    };
  } catch {
    return DEFAULTS;
  }
}

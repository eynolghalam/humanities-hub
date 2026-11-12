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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadAiSettings(userClient?: any): Promise<AiSettings> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any = userClient;
    if (!client) {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        client = supabaseAdmin;
      } else {
        // Self-hosted deployments (e.g. hozatona.ir) have no service-role key.
        // Fall back to an anon client built from the public values baked in at
        // build time (server.ts backfills SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY
        // from VITE_*). RLS still applies, so this only works for callers whose
        // policies allow the read — prefer passing the authenticated user client.
        const { createClient } = await import("@supabase/supabase-js");
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) return DEFAULTS;
        client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      }
    }
    const { data } = await client
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

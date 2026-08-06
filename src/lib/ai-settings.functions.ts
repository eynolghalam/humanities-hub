import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdminOrOwner(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (!roles.includes("admin") && !roles.includes("owner")) throw new Error("دسترسی غیرمجاز.");
}

const mask = (v: string | null) => (v ? `${v.slice(0, 4)}••••${v.slice(-4)}` : "");

export const getAiSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminOrOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("ai_settings")
      .select("openrouter_api_key,openrouter_models,custom_base_url,custom_api_key,custom_models,google_translate_fallback")
      .eq("id", true)
      .maybeSingle();
    return {
      hasOpenrouterKey: !!data?.openrouter_api_key,
      openrouterKeyMasked: mask(data?.openrouter_api_key ?? null),
      openrouter_models: data?.openrouter_models ?? [],
      custom_base_url: data?.custom_base_url ?? "",
      hasCustomKey: !!data?.custom_api_key,
      customKeyMasked: mask(data?.custom_api_key ?? null),
      custom_models: data?.custom_models ?? [],
      google_translate_fallback: data?.google_translate_fallback ?? true,
      hasEnvOpenrouterKey: !!process.env.OPENROUTER_API_KEY,
    };
  });

export const saveAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    openrouter_api_key: z.string().nullable().optional(), // null = clear, undefined/"" = keep
    openrouter_models: z.array(z.string()).optional(),
    custom_base_url: z.string().nullable().optional(),
    custom_api_key: z.string().nullable().optional(),
    custom_models: z.array(z.string()).optional(),
    google_translate_fallback: z.boolean().optional(),
  }))
  .handler(async ({ data, context }) => {
    await requireAdminOrOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: Record<string, unknown> = { id: true, updated_at: new Date().toISOString() };
    if (data.openrouter_api_key !== undefined && data.openrouter_api_key !== "") {
      patch.openrouter_api_key = data.openrouter_api_key;
    }
    if (data.custom_api_key !== undefined && data.custom_api_key !== "") {
      patch.custom_api_key = data.custom_api_key;
    }
    if (data.openrouter_models) patch.openrouter_models = data.openrouter_models.filter(Boolean);
    if (data.custom_models) patch.custom_models = data.custom_models.filter(Boolean);
    if (data.custom_base_url !== undefined) patch.custom_base_url = data.custom_base_url || null;
    if (data.google_translate_fallback !== undefined) patch.google_translate_fallback = data.google_translate_fallback;

    const { error } = await supabaseAdmin.from("ai_settings").upsert(patch, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Send a tiny prompt through the fallback chain to verify configuration. */
export const testAiProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminOrOwner(context.supabase, context.userId);
    const { callAIWithFallback } = await import("./ai-fallback.server");
    try {
      const json = await callAIWithFallback({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: "بگو: سلام" }],
      });
      return { ok: true as const, reply: String(json.choices?.[0]?.message?.content ?? "").slice(0, 200) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  });

/** Verify the free Google Translate fallback works. */
export const testGoogleTranslate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminOrOwner(context.supabase, context.userId);
    const { googleTranslate } = await import("./google-translate.server");
    try {
      const out = await googleTranslate("<p>Peace be upon you</p>", "fa");
      return { ok: true as const, reply: out };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  });

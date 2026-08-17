import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizePhone, phoneToEmail } from "./phone";

async function requireAdminOrOwner(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (!roles.includes("admin") && !roles.includes("owner")) throw new Error("دسترسی غیرمجاز.");
}

const mask = (v: string | null) => (v ? `${v.slice(0, 3)}••••${v.slice(-3)}` : "");

/** Public: what the auth page should offer. */
export const getPhoneAuthConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { loadSmsSettings } = await import("./sms.server");
  const s = await loadSmsSettings();
  return { enabled: s.enabled && !!s.send_url, authMode: s.auth_mode };
});

export const getSmsSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminOrOwner(context.supabase, context.userId);
    const { loadSmsSettings } = await import("./sms.server");
    const s = await loadSmsSettings();
    return { ...s, api_key: undefined, hasApiKey: !!s.api_key, apiKeyMasked: mask(s.api_key) };
  });

export const saveSmsSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    enabled: z.boolean().optional(),
    auth_mode: z.enum(["otp", "password", "both"]).optional(),
    send_url: z.string().nullable().optional(),
    http_method: z.enum(["GET", "POST"]).optional(),
    headers_json: z.string().nullable().optional(),
    body_template: z.string().nullable().optional(),
    api_key: z.string().nullable().optional(),
    sender: z.string().nullable().optional(),
    message_template: z.string().optional(),
    code_ttl_seconds: z.number().int().min(60).max(1800).optional(),
  }))
  .handler(async ({ data, context }) => {
    await requireAdminOrOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { id: true, updated_at: new Date().toISOString() };
    for (const k of ["enabled", "auth_mode", "http_method", "message_template", "code_ttl_seconds"] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    for (const k of ["send_url", "headers_json", "body_template", "sender"] as const) {
      if (data[k] !== undefined) patch[k] = data[k] || null;
    }
    if (data.api_key !== undefined && data.api_key !== "") patch.api_key = data.api_key;
    const { error } = await supabaseAdmin.from("sms_settings").upsert(patch, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTestSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ phone: z.string().min(5) }))
  .handler(async ({ data, context }) => {
    await requireAdminOrOwner(context.supabase, context.userId);
    const { loadSmsSettings, sendSms } = await import("./sms.server");
    const s = await loadSmsSettings();
    try {
      await sendSms(normalizePhone(data.phone), "پیامک آزمایشی حوزتنا ✅", s);
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  });

/** Public: request a one-time code for signup or login. */
export const requestPhoneCode = createServerFn({ method: "POST" })
  .inputValidator(z.object({ phone: z.string().min(5) }))
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    if (!/^\d{10,15}$/.test(phone)) throw new Error("شمارهٔ موبایل معتبر نیست.");
    const { loadSmsSettings, sendSms, hashCode, randomCode } = await import("./sms.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = await loadSmsSettings();
    if (!s.enabled) throw new Error("ورود با شمارهٔ موبایل فعال نیست.");

    // rate limit: max 3 codes per phone per 10 minutes
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("phone_otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) throw new Error("تعداد درخواست‌ها زیاد است؛ چند دقیقه بعد تلاش کنید.");

    const code = randomCode();
    const { error } = await supabaseAdmin.from("phone_otp_codes").insert({
      phone,
      code_hash: await hashCode(phone, code),
      expires_at: new Date(Date.now() + s.code_ttl_seconds * 1000).toISOString(),
    });
    if (error) throw new Error(error.message);
    await sendSms(phone, s.message_template.replace("{code}", code), s);
    return { ok: true, ttl: s.code_ttl_seconds };
  });

async function consumeCode(phone: string, code: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { hashCode } = await import("./sms.server");
  const hash = await hashCode(phone, code);
  const { data: row } = await supabaseAdmin
    .from("phone_otp_codes")
    .select("id,expires_at,consumed_at")
    .eq("phone", phone)
    .eq("code_hash", hash)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) throw new Error("کد وارد شده نادرست است.");
  if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("کد منقضی شده است.");
  await supabaseAdmin.from("phone_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
}

async function ensureUser(phone: string, fullName: string | undefined, password?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = phoneToEmail(phone);
  const { data: existing } = await supabaseAdmin
    .from("profiles").select("id").eq("phone", phone).maybeSingle();
  if (existing?.id) {
    if (password) await supabaseAdmin.auth.admin.updateUserById(existing.id, { password });
    return { userId: existing.id, email, created: false };
  }
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: password ?? crypto.randomUUID(),
    user_metadata: { full_name: fullName ?? "", requested_role: "student", phone },
  });
  if (error || !created.user) throw new Error(error?.message ?? "ایجاد حساب ناموفق بود.");
  await supabaseAdmin.from("profiles").update({ phone, ...(fullName ? { full_name: fullName } : {}) }).eq("id", created.user.id);
  return { userId: created.user.id, email, created: true };
}

/** Public: verify the code and return a one-time link the client exchanges for a session. */
export const verifyPhoneCode = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    phone: z.string().min(5),
    code: z.string().min(4).max(8),
    fullName: z.string().max(120).optional(),
    password: z.string().min(6).max(72).optional(),
  }))
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    const { loadSmsSettings } = await import("./sms.server");
    const s = await loadSmsSettings();
    if (!s.enabled) throw new Error("ورود با شمارهٔ موبایل فعال نیست.");
    await consumeCode(phone, data.code);
    const { email } = await ensureUser(phone, data.fullName, data.password);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !link.properties?.hashed_token) throw new Error(error?.message ?? "ورود ناموفق بود.");
    return { email, tokenHash: link.properties.hashed_token };
  });

/** Public: password login with a phone number. */
export const phoneLoginEmail = createServerFn({ method: "POST" })
  .inputValidator(z.object({ phone: z.string().min(5) }))
  .handler(async ({ data }) => {
    const { loadSmsSettings } = await import("./sms.server");
    const s = await loadSmsSettings();
    if (!s.enabled || s.auth_mode === "otp") throw new Error("ورود با رمز عبور فعال نیست.");
    return { email: phoneToEmail(normalizePhone(data.phone)) };
  });

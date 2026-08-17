import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface SmsSettings {
  enabled: boolean;
  auth_mode: "otp" | "password" | "both";
  send_url: string | null;
  http_method: string;
  headers_json: string | null;
  body_template: string | null;
  api_key: string | null;
  sender: string | null;
  message_template: string;
  code_ttl_seconds: number;
}

export async function loadSmsSettings(): Promise<SmsSettings> {
  const { data } = await supabaseAdmin.from("sms_settings").select("*").eq("id", true).maybeSingle();
  return {
    enabled: data?.enabled ?? false,
    auth_mode: (data?.auth_mode as SmsSettings["auth_mode"]) ?? "otp",
    send_url: data?.send_url ?? null,
    http_method: data?.http_method ?? "POST",
    headers_json: data?.headers_json ?? null,
    body_template: data?.body_template ?? null,
    api_key: data?.api_key ?? null,
    sender: data?.sender ?? null,
    message_template: data?.message_template ?? "کد ورود شما: {code}",
    code_ttl_seconds: data?.code_ttl_seconds ?? 300,
  };
}

function fill(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? "");
}

/** Send an SMS through the generic, admin-configured HTTP gateway. */
export async function sendSms(phone: string, message: string, s: SmsSettings): Promise<void> {
  if (!s.send_url) throw new Error("پنل پیامکی پیکربندی نشده است.");
  const vars = {
    phone,
    message,
    api_key: s.api_key ?? "",
    sender: s.sender ?? "",
  };
  const url = fill(s.send_url, {
    ...vars,
    message: encodeURIComponent(message),
    phone: encodeURIComponent(phone),
  });
  const method = (s.http_method || "POST").toUpperCase();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (s.headers_json) {
    try {
      const parsed = JSON.parse(fill(s.headers_json, vars)) as Record<string, string>;
      Object.assign(headers, parsed);
    } catch {
      throw new Error("قالب هدرها JSON معتبر نیست.");
    }
  }
  const init: RequestInit = { method, headers };
  if (method !== "GET" && s.body_template) {
    init.body = fill(s.body_template, {
      ...vars,
      message: message.replace(/"/g, '\\"').replace(/\n/g, "\\n"),
    });
  }
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`خطای پنل پیامکی (${res.status}): ${text.slice(0, 200)}`);
}

export async function hashCode(phone: string, code: string): Promise<string> {
  const data = new TextEncoder().encode(`${phone}:${code}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function randomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

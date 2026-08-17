import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { getSmsSettings, saveSmsSettings, sendTestSms } from "@/lib/sms.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ChevronLeft, MessageSquare, Loader2, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/sms")({
  component: SmsSettingsPage,
});

type Mode = "otp" | "password" | "both";

function SmsSettingsPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !isAdmin) navigate({ to: "/courses" }); }, [loading, isAdmin, navigate]);

  const getFn = useServerFn(getSmsSettings);
  const saveFn = useServerFn(saveSmsSettings);
  const testFn = useServerFn(sendTestSms);

  const { data, refetch } = useQuery({ queryKey: ["sms-settings"], queryFn: () => getFn(), enabled: isAdmin });

  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<Mode>("otp");
  const [sendUrl, setSendUrl] = useState("");
  const [method, setMethod] = useState<"GET" | "POST">("POST");
  const [headers, setHeaders] = useState("");
  const [body, setBody] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [sender, setSender] = useState("");
  const [template, setTemplate] = useState("کد ورود شما به حوزتنا: {code}");
  const [ttl, setTtl] = useState(300);
  const [testPhone, setTestPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setMode(data.auth_mode);
    setSendUrl(data.send_url ?? "");
    setMethod((data.http_method as "GET" | "POST") ?? "POST");
    setHeaders(data.headers_json ?? "");
    setBody(data.body_template ?? "");
    setSender(data.sender ?? "");
    setTemplate(data.message_template);
    setTtl(data.code_ttl_seconds);
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await saveFn({ data: {
        enabled, auth_mode: mode, send_url: sendUrl, http_method: method,
        headers_json: headers, body_template: body, sender,
        message_template: template, code_ttl_seconds: ttl,
        ...(apiKey ? { api_key: apiKey } : {}),
      } });
      setApiKey("");
      toast.success("تنظیمات ذخیره شد");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true);
    try {
      const r = await testFn({ data: { phone: testPhone } });
      if (r.ok) toast.success("پیامک آزمایشی ارسال شد");
      else toast.error(r.error);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally { setTesting(false); }
  };

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/admin">
        <Button variant="ghost" size="sm" className="mb-4 gap-1"><ChevronLeft className="h-4 w-4" />پنل مدیریت</Button>
      </Link>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">تنظیمات پنل پیامکی</h1>
          <p className="text-sm text-muted-foreground">ثبت‌نام و ورود کاربران با شمارهٔ موبایل</p>
        </div>
      </div>

      <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>فعال‌سازی ورود/ثبت‌نام با موبایل</Label>
            <p className="text-xs text-muted-foreground">در صورت غیرفعال بودن، فقط ورود با ایمیل در دسترس است.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label>روش ورود با موبایل</Label>
          <div className="grid grid-cols-3 gap-2">
            {([["otp", "کد پیامکی"], ["password", "رمز عبور"], ["both", "هر دو"]] as const).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setMode(v)}
                className={`rounded-lg border p-3 text-sm font-medium transition ${mode === v ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
              >{label}</button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>آدرس وب‌سرویس ارسال پیامک</Label>
          <Input dir="ltr" value={sendUrl} onChange={e => setSendUrl(e.target.value)} placeholder="https://api.example.com/send?apikey={api_key}&receptor={phone}&message={message}" />
          <p className="text-xs text-muted-foreground">متغیرهای مجاز: {"{phone}"}، {"{message}"}، {"{api_key}"}، {"{sender}"}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>متد HTTP</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["POST", "GET"] as const).map(m => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={`rounded-lg border p-2 text-sm font-medium transition ${method === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>{m}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>شمارهٔ فرستنده (اختیاری)</Label>
            <Input dir="ltr" value={sender} onChange={e => setSender(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>کلید API {data?.hasApiKey && <span className="text-xs text-muted-foreground">(ذخیره‌شده: {data.apiKeyMasked})</span>}</Label>
          <Input dir="ltr" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={data?.hasApiKey ? "برای تغییر، مقدار جدید وارد کنید" : ""} />
        </div>

        <div className="space-y-2">
          <Label>هدرهای درخواست (JSON، اختیاری)</Label>
          <Textarea dir="ltr" rows={3} value={headers} onChange={e => setHeaders(e.target.value)} placeholder='{"x-api-key":"{api_key}"}' />
        </div>

        <div className="space-y-2">
          <Label>قالب بدنهٔ درخواست (برای POST)</Label>
          <Textarea dir="ltr" rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder='{"receptor":"{phone}","sender":"{sender}","message":"{message}"}' />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>متن پیامک</Label>
            <Input value={template} onChange={e => setTemplate(e.target.value)} placeholder="کد ورود شما: {code}" />
          </div>
          <div className="space-y-2">
            <Label>مدت اعتبار کد (ثانیه)</Label>
            <Input dir="ltr" type="number" value={ttl} onChange={e => setTtl(Number(e.target.value))} />
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full bg-hero text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیرهٔ تنظیمات"}
        </Button>

        <div className="rounded-xl border border-dashed border-border p-4">
          <Label>ارسال پیامک آزمایشی</Label>
          <div className="mt-2 flex gap-2">
            <Input dir="ltr" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="09123456789" />
            <Button variant="outline" onClick={test} disabled={testing || !testPhone} className="gap-2">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}ارسال
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

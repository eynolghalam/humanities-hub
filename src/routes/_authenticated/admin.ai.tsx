import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sparkles, KeyRound, Languages, FlaskConical, Loader2 } from "lucide-react";
import { getAiSettings, saveAiSettings, testAiProviders, testGoogleTranslate } from "@/lib/ai-settings.functions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/ai")({
  component: AiSettingsPage,
  head: () => ({
    meta: [
      { title: "تنظیمات هوش مصنوعی | حوزتنا" },
      { name: "description", content: "پیکربندی ارائه‌دهنده‌های هوش مصنوعی رایگان و ترجمه جایگزین در حوزتنا." },
      { property: "og:title", content: "تنظیمات هوش مصنوعی | حوزتنا" },
      { property: "og:description", content: "پیکربندی ارائه‌دهنده‌های هوش مصنوعی رایگان و ترجمه جایگزین." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AiSettingsPage() {
  const { isAdmin, isOwner } = useAuth();
  const qc = useQueryClient();
  const load = useServerFn(getAiSettings);
  const save = useServerFn(saveAiSettings);
  const testAi = useServerFn(testAiProviders);
  const testGt = useServerFn(testGoogleTranslate);

  const { data } = useQuery({ queryKey: ["ai-settings"], queryFn: () => load(), enabled: isAdmin || isOwner });

  const [orKey, setOrKey] = useState("");
  const [orModels, setOrModels] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [customModels, setCustomModels] = useState("");
  const [gt, setGt] = useState(true);

  useEffect(() => {
    if (!data) return;
    setOrModels((data.openrouter_models ?? []).join("\n"));
    setBaseUrl(data.custom_base_url ?? "");
    setCustomModels((data.custom_models ?? []).join("\n"));
    setGt(data.google_translate_fallback);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () =>
      save({
        data: {
          openrouter_api_key: orKey || undefined,
          openrouter_models: orModels.split("\n").map(s => s.trim()).filter(Boolean),
          custom_base_url: baseUrl.trim(),
          custom_api_key: customKey || undefined,
          custom_models: customModels.split("\n").map(s => s.trim()).filter(Boolean),
          google_translate_fallback: gt,
        },
      }),
    onSuccess: () => {
      setOrKey("");
      setCustomKey("");
      toast.success("تنظیمات ذخیره شد.");
      qc.invalidateQueries({ queryKey: ["ai-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testAiMut = useMutation({
    mutationFn: () => testAi({ data: undefined }),
    onSuccess: r => (r.ok ? toast.success(`پاسخ دریافت شد: ${r.reply}`) : toast.error(r.error)),
    onError: (e: Error) => toast.error(e.message),
  });

  const testGtMut = useMutation({
    mutationFn: () => testGt({ data: undefined }),
    onSuccess: r => (r.ok ? toast.success(`ترجمه آزمایشی: ${r.reply}`) : toast.error(r.error)),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin && !isOwner) {
    return <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">دسترسی غیرمجاز.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-hero shadow-soft">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">تنظیمات هوش مصنوعی</h1>
          <p className="text-sm text-muted-foreground">
            وقتی اعتبار هوش مصنوعی اصلی تمام شود، به‌صورت خودکار از ارائه‌دهنده‌های رایگان زیر و در نهایت گوگل ترنسلیت استفاده می‌شود.
          </p>
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 font-bold"><KeyRound className="h-4 w-4" />OpenRouter (هوش مصنوعی رایگان)</div>
        <p className="text-xs text-muted-foreground">
          یک حساب رایگان در openrouter.ai بسازید، از بخش Keys یک API Key بسازید و اینجا وارد کنید. مدل‌های رایگان معمولاً با پسوند ‎:free‎ هستند.
        </p>
        <div className="space-y-2">
          <Label>API Key {data?.hasOpenrouterKey && <span className="text-xs text-muted-foreground">(ذخیره‌شده: {data.openrouterKeyMasked})</span>}</Label>
          <Input value={orKey} onChange={e => setOrKey(e.target.value)} placeholder="sk-or-v1-..." dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label>مدل‌های رایگان (هر خط یک مدل، به ترتیب اولویت)</Label>
          <Textarea value={orModels} onChange={e => setOrModels(e.target.value)} rows={4} dir="ltr" className="font-mono text-xs" />
        </div>
        {data?.hasEnvOpenrouterKey && <p className="text-xs text-muted-foreground">یک کلید OpenRouter در تنظیمات سرور نیز موجود است و در صورت خالی بودن این فیلد استفاده می‌شود.</p>}
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 font-bold"><KeyRound className="h-4 w-4" />ارائه‌دهنده سفارشی (سازگار با OpenAI)</div>
        <div className="space-y-2">
          <Label>آدرس پایه (Base URL)</Label>
          <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.groq.com/openai/v1" dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label>API Key {data?.hasCustomKey && <span className="text-xs text-muted-foreground">(ذخیره‌شده: {data.customKeyMasked})</span>}</Label>
          <Input value={customKey} onChange={e => setCustomKey(e.target.value)} placeholder="..." dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label>مدل‌ها (هر خط یک مدل)</Label>
          <Textarea value={customModels} onChange={e => setCustomModels(e.target.value)} rows={3} dir="ltr" className="font-mono text-xs" />
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold"><Languages className="h-4 w-4" />ترجمه جایگزین با Google Translate</div>
          <Switch checked={gt} onCheckedChange={setGt} />
        </div>
        <p className="text-xs text-muted-foreground">
          در صورت اتمام اعتبار هوش مصنوعی، ترجمه دروس با گوگل ترنسلیت (رایگان و بدون کلید) ادامه پیدا می‌کند و ساختار HTML حفظ می‌شود.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="bg-hero text-primary-foreground gap-2">
          {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}ذخیره تنظیمات
        </Button>
        <Button variant="outline" onClick={() => testAiMut.mutate()} disabled={testAiMut.isPending} className="gap-2">
          {testAiMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}تست هوش مصنوعی
        </Button>
        <Button variant="outline" onClick={() => testGtMut.mutate()} disabled={testGtMut.isPending} className="gap-2">
          {testGtMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}تست گوگل ترنسلیت
        </Button>
      </div>
    </div>
  );
}

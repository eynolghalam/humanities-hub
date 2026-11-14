import { useEffect, useState } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallApp() {
  const { lang } = useI18n();
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [instructions, setInstructions] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const label = lang === "en" ? "Install Hozatona" : lang === "ar" ? "تثبيت حوزتنا" : "نصب برنامهٔ حوزتنا";
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  const install = async () => {
    if (!prompt) { setInstructions(true); return; }
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };
  if (installed) return null;
  return <>
    <Button variant="outline" className="min-h-11 w-full justify-start gap-3" onClick={install}><Download className="h-5 w-5" />{label}</Button>
    <Dialog open={instructions} onOpenChange={setInstructions}>
      <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{label}</DialogTitle><DialogDescription>
        {lang === "en" ? "Open the published site in your phone’s browser." : lang === "ar" ? "افتح الموقع المنشور في متصفح هاتفك." : "سایت منتشرشده را در مرورگر گوشی باز کنید."}
      </DialogDescription></DialogHeader>
        <div className="flex items-start gap-3 text-sm leading-7"><Share className="mt-1 h-5 w-5 shrink-0 text-primary" /><p>{ios ? (lang === "en" ? "In Safari, tap Share, then Add to Home Screen." : lang === "ar" ? "في Safari اضغط مشاركة ثم إضافة إلى الشاشة الرئيسية." : "در Safari گزینهٔ اشتراک‌گذاری (Share) و سپس افزودن به صفحهٔ اصلی (Add to Home Screen) را انتخاب کنید.") : (lang === "en" ? "In Chrome’s menu, choose Install app or Add to Home screen. On desktop, use the install icon in the address bar." : lang === "ar" ? "من قائمة Chrome اختر تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية." : "در منوی Chrome، نصب برنامه (Install app) یا افزودن به صفحهٔ اصلی (Add to Home screen) را انتخاب کنید. روی رایانه از نشان نصب در نوار آدرس استفاده کنید.")}</p><SquarePlus className="mt-1 h-5 w-5 shrink-0 text-primary" /></div>
      </DialogContent>
    </Dialog>
  </>;
}
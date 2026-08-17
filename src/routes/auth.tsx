import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getPhoneAuthConfig, requestPhoneCode, verifyPhoneCode, phoneLoginEmail } from "@/lib/sms.functions";
import { isValidPhone } from "@/lib/phone";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next: typeof s.next === "string" && s.next.startsWith("/") ? s.next : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const dest = next ?? "/courses";
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [requestedRole, setRequestedRole] = useState<"student" | "teacher">("student");

  useEffect(() => {
    if (user) navigate({ to: dest });
  }, [user, navigate, dest]);


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else navigate({ to: dest });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${dest}`,
        data: { full_name: fullName, requested_role: requestedRole },
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t("confirmEmailMsg"));
      if (requestedRole === "teacher") toast.info(t("pendingTeacherMsg"));
    }
  };

  const cfgFn = useServerFn(getPhoneAuthConfig);
  const { data: phoneCfg } = useQuery({ queryKey: ["phone-auth-config"], queryFn: () => cfgFn() });
  const phoneEnabled = !!phoneCfg?.enabled;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elegant">
          <h1 className="mb-6 text-center text-2xl font-extrabold">{t("welcome")}</h1>
          <Tabs defaultValue={phoneEnabled ? "phone" : "signin"}>
            <TabsList className={`grid w-full ${phoneEnabled ? "grid-cols-3" : "grid-cols-2"}`}>
              {phoneEnabled && <TabsTrigger value="phone">موبایل</TabsTrigger>}
              <TabsTrigger value="signin">{t("login")}</TabsTrigger>
              <TabsTrigger value="signup">{t("signup")}</TabsTrigger>
            </TabsList>
            {phoneEnabled && (
              <TabsContent value="phone">
                <PhoneAuth mode={phoneCfg!.authMode} onDone={() => navigate({ to: dest })} />
              </TabsContent>
            )}

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email1">{t("email")}</Label>
                  <Input id="email1" type="email" required value={email} onChange={e => setEmail(e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw1">{t("password")}</Label>
                  <Input id="pw1" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} dir="ltr" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-hero text-primary-foreground hover:opacity-95">
                  {loading ? t("loading") : t("login")}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("fullName")}</Label>
                  <Input id="name" required value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">{t("email")}</Label>
                  <Input id="email2" type="email" required value={email} onChange={e => setEmail(e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw2">{t("password")}</Label>
                  <Input id="pw2" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>{t("signupAs")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRequestedRole("student")}
                      className={`rounded-lg border p-3 text-sm font-medium transition ${requestedRole === "student" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
                    >{t("studentRole")}</button>
                    <button
                      type="button"
                      onClick={() => setRequestedRole("teacher")}
                      className={`rounded-lg border p-3 text-sm font-medium transition ${requestedRole === "teacher" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
                    >{t("teacherRole")}</button>
                  </div>
                  {requestedRole === "teacher" && (
                    <p className="text-xs text-muted-foreground">{t("pendingTeacherMsg")}</p>
                  )}
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-hero text-primary-foreground hover:opacity-95">
                  {loading ? t("loading") : t("signup")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

function PhoneAuth({ mode, onDone }: { mode: "otp" | "password" | "both"; onDone: () => void }) {
  const requestFn = useServerFn(requestPhoneCode);
  const verifyFn = useServerFn(verifyPhoneCode);
  const loginEmailFn = useServerFn(phoneLoginEmail);

  const [tab, setTab] = useState<"otp" | "password">(mode === "password" ? "password" : "otp");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (!isValidPhone(phone)) { toast.error("شمارهٔ موبایل معتبر نیست."); return; }
    setBusy(true);
    try {
      await requestFn({ data: { phone } });
      setSent(true);
      toast.success("کد تأیید پیامک شد");
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const res = await verifyFn({ data: { phone, code, fullName: name || undefined, password: pw || undefined } });
      const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: res.tokenHash });
      if (error) throw error;
      toast.success("خوش آمدید");
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setBusy(false); }
  };

  const passwordLogin = async () => {
    setBusy(true);
    try {
      const { email } = await loginEmailFn({ data: { phone } });
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) throw new Error("شماره یا رمز عبور نادرست است.");
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 pt-4">
      {mode === "both" && (
        <div className="grid grid-cols-2 gap-2">
          {([["otp", "کد پیامکی"], ["password", "رمز عبور"]] as const).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setTab(v)}
              className={`rounded-lg border p-2 text-sm font-medium transition ${tab === v ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>{label}</button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="phone">شمارهٔ موبایل</Label>
        <Input id="phone" dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09123456789" disabled={sent} />
      </div>

      {tab === "password" && mode !== "otp" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="pwp">رمز عبور</Label>
            <Input id="pwp" type="password" dir="ltr" value={pw} onChange={e => setPw(e.target.value)} />
          </div>
          <Button onClick={passwordLogin} disabled={busy || !phone || pw.length < 6} className="w-full bg-hero text-primary-foreground">ورود</Button>
          <p className="text-center text-xs text-muted-foreground">
            حساب ندارید؟ از روش «کد پیامکی» ثبت‌نام کنید.
          </p>
        </>
      ) : (
        <>
          {!sent ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="pn">نام و نام خانوادگی (برای ثبت‌نام)</Label>
                <Input id="pn" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <Button onClick={sendCode} disabled={busy || !phone} className="w-full bg-hero text-primary-foreground">
                ارسال کد تأیید
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="otp">کد تأیید پیامک‌شده</Label>
                <Input id="otp" dir="ltr" inputMode="numeric" value={code} onChange={e => setCode(e.target.value)} />
              </div>
              {mode !== "otp" && (
                <div className="space-y-2">
                  <Label htmlFor="pwset">تعیین رمز عبور (اختیاری)</Label>
                  <Input id="pwset" type="password" dir="ltr" value={pw} onChange={e => setPw(e.target.value)} placeholder="حداقل ۶ کاراکتر" />
                </div>
              )}
              <Button onClick={verify} disabled={busy || code.length < 4} className="w-full bg-hero text-primary-foreground">
                تأیید و ورود
              </Button>
              <button type="button" onClick={() => { setSent(false); setCode(""); }} className="w-full text-xs text-muted-foreground hover:underline">
                تغییر شماره / ارسال مجدد کد
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

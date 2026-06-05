import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [requestedRole, setRequestedRole] = useState<"student" | "teacher">("student");

  useEffect(() => {
    if (user) navigate({ to: "/courses" });
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else navigate({ to: "/courses" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/courses`,
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elegant">
          <h1 className="mb-6 text-center text-2xl font-extrabold">{t("welcome")}</h1>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t("login")}</TabsTrigger>
              <TabsTrigger value="signup">{t("signup")}</TabsTrigger>
            </TabsList>
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

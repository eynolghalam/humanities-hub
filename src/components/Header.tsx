import { Link, useNavigate } from "@tanstack/react-router";
import { useI18n, type Lang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Menu, Palette, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/hooks/use-theme";
import { themeNames } from "@/lib/theme";
import { useState } from "react";
import { BookOpen, LogOut, Shield, Languages, GraduationCap, Map, BarChart3, MessageCircleQuestion } from "lucide-react";
import { StatsBar } from "@/components/StatsBar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { InstallApp } from "@/components/InstallApp";
import { SiteLogo } from '@/components/SiteLogo';
import { Sparkles } from 'lucide-react';
import { useSignInPrompt } from './SignInPrompt';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGS: { code: Lang; label: string }[] = [
  { code: "fa", label: "فارسی" },
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
];

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { user, isAdmin, isTeacher, signOut } = useAuth();
  const navigate = useNavigate();
  const { currentTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const requestSignIn = useSignInPrompt();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <SiteLogo />
          <span className="text-lg font-extrabold tracking-tight">{t("appName")}</span>
        </Link>

        <div className="flex items-center gap-2 md:hidden">
          {user && <StatsBar />}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="منو"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side={lang === "en" ? "right" : "left"} className="w-72 overflow-y-auto">
              <SheetHeader><SheetTitle>{t("appName")}</SheetTitle></SheetHeader>
              <div className="mt-6 space-y-6">
                {(isAdmin || isTeacher) && (
                  <Link to="/admin" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl bg-primary/10 px-3 font-semibold text-primary">
                    {isAdmin ? <Shield className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
                    {isAdmin ? t("managePanel") : t("teacherPanel")}
                  </Link>
                )}
                <section>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground"><Palette className="h-4 w-4" />انتخاب تم</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {themeNames.map(th => (
                      <button key={th.name} onClick={() => setTheme(th.name)} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm ${currentTheme === th.name ? "border-primary bg-primary/10 font-semibold" : "border-border"}`}>
                        <span>{th.emoji}</span><span className="truncate">{th.label}</span>
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground"><Languages className="h-4 w-4" />زبان</h3>
                  <div className="space-y-1">
                    {LANGS.map(l => (
                      <button key={l.code} onClick={() => setLang(l.code)} className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-sm ${lang === l.code ? "bg-accent font-semibold" : "hover:bg-muted"}`}>
                        {l.label}{lang === l.code && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </section>
                <InstallApp />
                {user ? (
                  <Button variant="outline" className="w-full gap-2 text-destructive" onClick={() => { setOpen(false); handleSignOut(); }}>
                    <LogOut className="h-4 w-4" />{t("logout")}
                  </Button>
                ) : (
                  <Link to="/auth" onClick={() => setOpen(false)}><Button className="w-full bg-hero text-primary-foreground">{t("login")}</Button></Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => requestSignIn(() => navigate({ to: '/ask' }))}><Sparkles className="h-4 w-4" />پاسخ‌یار</Button>
          {user && <StatsBar />}
          {(
            <Link to="/courses">
              <Button variant="ghost" size="sm">{t("courses")}</Button>
            </Link>
          )}
          {user && (
            <Link to="/journey">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">{t("journey")}</span>
              </Button>
            </Link>
          )}
          {user && (
            <Link to="/stats">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">{t("stats")}</span>
              </Button>
            </Link>
          )}
          {(
            <Link to="/questions" onClick={e => { if (!user) { e.preventDefault(); requestSignIn(() => navigate({ to: '/questions' }), 'teacher'); } }}>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <MessageCircleQuestion className="h-4 w-4" />
                <span className="hidden sm:inline">پرسش و پاسخ</span>
              </Button>
            </Link>
          )}
          {(isAdmin || isTeacher) && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5">
                {isAdmin ? <Shield className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                <span className="hidden sm:inline">{isAdmin ? t("managePanel") : t("teacherPanel")}</span>
              </Button>
            </Link>
          )}
          <ThemeSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Languages className="h-4 w-4" />
                <span className="text-xs uppercase">{lang}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LANGS.map(l => (
                <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)}>
                  {l.label}{lang === l.code ? " ✓" : ""}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {user ? (
            <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1.5">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </Button>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="bg-hero text-primary-foreground hover:opacity-90">
                {t("login")}
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

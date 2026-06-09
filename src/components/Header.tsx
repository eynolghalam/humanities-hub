import { Link, useNavigate } from "@tanstack/react-router";
import { useI18n, type Lang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, Shield, Languages, GraduationCap, Map, BarChart3 } from "lucide-react";
import { StatsBar } from "@/components/StatsBar";
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

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-hero shadow-soft">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-extrabold tracking-tight">{t("appName")}</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user && <StatsBar />}
          {user && (
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
          {(isAdmin || isTeacher) && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5">
                {isAdmin ? <Shield className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                <span className="hidden sm:inline">{isAdmin ? t("managePanel") : t("teacherPanel")}</span>
              </Button>
            </Link>
          )}
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

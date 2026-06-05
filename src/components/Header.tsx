import { Link, useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, Shield, Languages } from "lucide-react";

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { user, isAdmin, signOut } = useAuth();
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
          {user && (
            <Link to="/courses">
              <Button variant="ghost" size="sm">{t("courses")}</Button>
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Shield className="h-4 w-4" />
                {t("admin")}
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === "fa" ? "en" : "fa")}
            className="gap-1.5"
          >
            <Languages className="h-4 w-4" />
            {lang === "fa" ? "EN" : "FA"}
          </Button>
          {user ? (
            <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1.5">
              <LogOut className="h-4 w-4" />
              {t("logout")}
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

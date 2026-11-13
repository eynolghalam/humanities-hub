import { Link } from "@tanstack/react-router";
import { BookOpen, Map, BarChart3, MessageCircleQuestion } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export function MobileBottomNav() {
  const { t } = useI18n();
  const { user } = useAuth();
  if (!user) return null;
  const items = [
    { to: "/courses", label: t("courses"), icon: BookOpen },
    { to: "/journey", label: t("journey"), icon: Map },
    { to: "/stats", label: t("stats"), icon: BarChart3 },
    { to: "/questions", label: "پرسش و پاسخ", icon: MessageCircleQuestion },
  ] as const;
  return (
    <nav
      aria-label="ناوبری اصلی"
      className="fixed inset-x-3 bottom-3 z-40 md:hidden rounded-3xl border border-border/60 bg-background/60 shadow-elegant backdrop-blur-2xl backdrop-saturate-150"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="group flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary", "aria-current": "page" }}
            >
              <span className="flex h-8 w-12 items-center justify-center rounded-full transition-colors group-aria-[current=page]:bg-primary/15">
                <Icon className="h-5 w-5" />
              </span>
              <span className="max-w-full truncate">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

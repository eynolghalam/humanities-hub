import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Home } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export type Crumb = {
  label: string;
  to?: string;
  params?: Record<string, string>;
  /** Optional dropdown with sibling items for quick navigation */
  siblings?: Array<{ id: string; label: string; to: string; params: Record<string, string> }>;
  currentId?: string;
};

export function BreadcrumbNav({ items }: { items: Crumb[] }) {
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const chev = <ChevronLeft className={`h-3.5 w-3.5 shrink-0 text-muted-foreground ${dir === "ltr" ? "rotate-180" : ""}`} />;

  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card/60 px-3 py-2 text-sm shadow-soft">
      <Link to="/courses" className="flex items-center gap-1 text-muted-foreground hover:text-primary">
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("courses")}</span>
      </Link>
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {chev}
            {c.siblings && c.siblings.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 px-2 font-semibold ${isLast ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {c.label}
                    <ChevronLeft className="ms-1 h-3 w-3 -rotate-90" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 overflow-auto">
                  {c.siblings.map(s => (
                    <DropdownMenuItem
                      key={s.id}
                      onSelect={() => navigate({ to: s.to as any, params: s.params as any })}
                      className={s.id === c.currentId ? "font-bold text-primary" : ""}
                    >
                      {s.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : c.to && !isLast ? (
              <Link
                to={c.to as any}
                params={c.params as any}
                className="px-1 text-muted-foreground hover:text-primary"
              >
                {c.label}
              </Link>
            ) : (
              <span className="px-1 font-semibold text-foreground">{c.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

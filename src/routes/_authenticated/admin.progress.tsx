import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllUsersProgress } from "@/lib/exam.functions";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Zap, Flame, Heart, Trophy, CheckCircle2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  const { isAdmin, isOwner, loading } = useAuth();
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"xp" | "streak" | "completed" | "weekly">("xp");

  useEffect(() => {
    if (!loading && !isAdmin && !isOwner) navigate({ to: "/admin" });
  }, [loading, isAdmin, isOwner, navigate]);

  const fetchFn = useServerFn(listAllUsersProgress);
  const { data, isLoading } = useQuery({
    queryKey: ["all-users-progress"],
    queryFn: () => fetchFn(),
    enabled: isAdmin || isOwner,
  });

  const rows = useMemo(() => {
    const list = (data ?? []).filter(u => !q.trim() || (u.full_name ?? "").toLowerCase().includes(q.trim().toLowerCase()));
    const sorted = [...list];
    if (sort === "xp") sorted.sort((a, b) => b.total_xp - a.total_xp);
    else if (sort === "weekly") sorted.sort((a, b) => b.weekly_xp - a.weekly_xp);
    else if (sort === "streak") sorted.sort((a, b) => b.current_streak - a.current_streak);
    else if (sort === "completed") sorted.sort((a, b) => b.completed_lessons - a.completed_lessons);
    return sorted;
  }, [data, q, sort]);

  if (!isAdmin && !isOwner) return null;

  const leagueColor = (lg: string) =>
    lg === "diamond" ? "text-sky-400" : lg === "gold" ? "text-amber-500" : lg === "silver" ? "text-slate-400" : "text-orange-600";

  return (
    <div>
      <Link to="/admin">
        <Button variant="ghost" size="sm" className="mb-4 gap-1">
          <ChevronLeft className={`h-4 w-4 ${dir === "ltr" ? "rotate-180" : ""}`} />
          {t("managePanel")}
        </Button>
      </Link>

      <h1 className="text-3xl font-extrabold">پیشرفت تحصیلی طلاب</h1>
      <p className="mt-1 text-sm text-muted-foreground">مشاهده امتیاز، روند مطالعه و درس‌های تکمیل‌شده تمامی کاربران.</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجوی نام…" className="ps-8 w-[260px]" />
        </div>
        <div className="flex gap-1">
          {(["xp","weekly","streak","completed"] as const).map(s => (
            <Button key={s} size="sm" variant={sort === s ? "default" : "outline"} onClick={() => setSort(s)}>
              {s === "xp" ? "کل امتیاز" : s === "weekly" ? "امتیاز هفته" : s === "streak" ? "روند" : "درس‌های تکمیل"}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && <p className="mt-6 text-muted-foreground">{t("loading")}</p>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground">
            <tr>
              <th className="p-3 text-start">#</th>
              <th className="p-3 text-start">نام</th>
              <th className="p-3 text-start">نقش</th>
              <th className="p-3"><Zap className="inline h-4 w-4 text-amber-500" /> کل XP</th>
              <th className="p-3">XP هفته</th>
              <th className="p-3"><Flame className="inline h-4 w-4 text-orange-500" /> روند</th>
              <th className="p-3"><CheckCircle2 className="inline h-4 w-4 text-emerald-500" /> درس‌ها</th>
              <th className="p-3"><Heart className="inline h-4 w-4 text-rose-500" /> قلب</th>
              <th className="p-3"><Trophy className="inline h-4 w-4 text-purple-500" /> لیگ</th>
              <th className="p-3">آخرین فعالیت</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u, i) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3 text-muted-foreground">{i + 1}</td>
                <td className="p-3 font-semibold">{u.full_name || "—"}</td>
                <td className="p-3">
                  <Badge variant="secondary" className="text-xs">
                    {u.role === "owner" ? "مالک" : u.role === "admin" ? t("adminRole") : u.role === "teacher" ? t("teacherRole") : t("studentRole")}
                  </Badge>
                </td>
                <td className="p-3 text-center font-bold">{u.total_xp}</td>
                <td className="p-3 text-center">{u.weekly_xp}</td>
                <td className="p-3 text-center">{u.current_streak}<span className="text-xs text-muted-foreground"> / {u.longest_streak}</span></td>
                <td className="p-3 text-center">{u.completed_lessons}</td>
                <td className="p-3 text-center">{u.hearts}</td>
                <td className={`p-3 text-center font-semibold capitalize ${leagueColor(u.league)}`}>{u.league}</td>
                <td className="p-3 text-center text-xs text-muted-foreground">{u.last_activity_date ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && !isLoading && (
              <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">هیچ کاربری یافت نشد.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

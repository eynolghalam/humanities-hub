import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUserStats } from "@/lib/exercises.functions";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Flame, Heart, Zap, Trophy, Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/stats")({
  component: StatsPage,
});

const BADGES = [
  "first_lesson", "streak_7", "streak_30", "xp_100", "xp_1000", "xp_5000",
];

function StatsPage() {
  const { t } = useI18n();
  const fn = useServerFn(getUserStats);
  const { data } = useQuery({ queryKey: ["user-stats"], queryFn: () => fn() });
  const s = data?.stats;
  const earned = new Set((data?.badges ?? []).map(b => b.badge_key));

  const leagueKey = s?.league ?? "bronze";
  const leagueLabel =
    leagueKey === "diamond" ? t("leagueDiamond") :
    leagueKey === "gold" ? t("leagueGold") :
    leagueKey === "silver" ? t("leagueSilver") : t("leagueBronze");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">{t("stats")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Zap className="h-6 w-6 text-amber-500" />} label={t("xp")} value={s?.total_xp ?? 0} />
        <StatCard icon={<Flame className="h-6 w-6 text-orange-500" />} label={t("streak")} value={s?.current_streak ?? 0} sub={`max ${s?.longest_streak ?? 0}`} />
        <StatCard icon={<Heart className="h-6 w-6 text-rose-500" />} label={t("hearts")} value={s?.hearts ?? 0} />
        <StatCard icon={<Trophy className="h-6 w-6 text-purple-500" />} label={t("league")} value={leagueLabel} sub={`${t("weeklyXP")}: ${s?.weekly_xp ?? 0}`} />
      </div>

      <Card className="p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Award className="h-5 w-5 text-primary" /> {t("achievements")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {BADGES.map(b => {
            const got = earned.has(b);
            return (
              <div
                key={b}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition ${
                  got ? "border-primary bg-primary/5" : "border-dashed opacity-50"
                }`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl ${got ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  🏅
                </div>
                <span className="text-xs font-semibold">{t(`badge_${b}` as never)}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-muted p-2">{icon}</div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground">{label}</div>
          <div className="text-2xl font-extrabold">{value}</div>
          {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

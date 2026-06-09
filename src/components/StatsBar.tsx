import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUserStats } from "@/lib/exercises.functions";
import { Flame, Heart, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function StatsBar() {
  const { user } = useAuth();
  const fn = useServerFn(getUserStats);
  const { data } = useQuery({
    queryKey: ["user-stats"],
    queryFn: () => fn(),
    enabled: !!user,
    staleTime: 30_000,
  });
  if (!user || !data?.stats) return null;
  const s = data.stats;
  return (
    <div className="flex items-center gap-3 text-xs font-bold">
      <span className="flex items-center gap-1 text-amber-500" title="XP">
        <Zap className="h-4 w-4 fill-current" />{s.total_xp}
      </span>
      <span className="flex items-center gap-1 text-orange-500" title="Streak">
        <Flame className="h-4 w-4 fill-current" />{s.current_streak}
      </span>
      <span className="flex items-center gap-1 text-rose-500" title="Hearts">
        <Heart className="h-4 w-4 fill-current" />{s.hearts}
      </span>
    </div>
  );
}

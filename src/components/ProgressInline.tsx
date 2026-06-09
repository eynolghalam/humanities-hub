import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBookProgress, getCourseProgress } from "@/lib/exercises.functions";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";

export function BookProgressBar({ bookId }: { bookId: string }) {
  const { t } = useI18n();
  const fn = useServerFn(getBookProgress);
  const { data } = useQuery({
    queryKey: ["book-progress", bookId],
    queryFn: () => fn({ data: { bookId } }),
    staleTime: 30_000,
  });
  if (!data || data.total === 0) return null;
  return (
    <div className="mt-4 space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>{t("yourProgress")}</span>
        <span>{data.completed}/{data.total} • {data.percent}%</span>
      </div>
      <Progress value={data.percent} />
    </div>
  );
}

export function CourseProgressBar({ courseId }: { courseId: string }) {
  const { t } = useI18n();
  const fn = useServerFn(getCourseProgress);
  const { data } = useQuery({
    queryKey: ["course-progress", courseId],
    queryFn: () => fn({ data: { courseId } }),
    staleTime: 30_000,
  });
  if (!data || data.total === 0) return null;
  return (
    <div className="mt-4 space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>{t("yourProgress")}</span>
        <span>{data.completed}/{data.total} • {data.percent}%</span>
      </div>
      <Progress value={data.percent} />
    </div>
  );
}

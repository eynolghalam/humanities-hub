import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listCoursesWithProgress, getCourseJourney } from "@/lib/journey.functions";
import { useI18n } from "@/lib/i18n";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Lock, Check, Star, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/journey")({
  component: JourneyPage,
});

function JourneyPage() {
  const { t } = useI18n();
  const listFn = useServerFn(listCoursesWithProgress);
  const { data: courses } = useQuery({
    queryKey: ["journey-courses"],
    queryFn: () => listFn(),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const activeId = selected ?? courses?.[0]?.id ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">{t("journey")}</h1>
        <p className="mt-2 text-muted-foreground">{t("heroSub")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(courses ?? []).map(c => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-bold transition ${
              activeId === c.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary"
            }`}
          >
            {c.title} <span className="opacity-75">({c.percent}%)</span>
          </button>
        ))}
      </div>

      {(courses ?? []).map(c => (
        activeId === c.id && (
          <div key={c.id}>
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span>{c.title}</span>
                <span className="text-muted-foreground">{c.completed}/{c.total}</span>
              </div>
              <Progress value={c.percent} />
            </Card>
            <JourneyTree courseId={c.id} />
          </div>
        )
      ))}
      {courses && courses.length === 0 && (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          {t("noCourses")}
        </div>
      )}
    </div>
  );
}

function JourneyTree({ courseId }: { courseId: string }) {
  const { t } = useI18n();
  const fn = useServerFn(getCourseJourney);
  const { data } = useQuery({
    queryKey: ["journey", courseId],
    queryFn: () => fn({ data: { courseId } }),
  });
  if (!data) return null;
  return (
    <div className="mt-6 space-y-10">
      {data.books.map(b => (
        <section key={b.id}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <BookOpen className="h-5 w-5 text-primary" />
            {b.title}
          </h2>
          {b.lessons.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("noLessons")}</p>
          )}
          <div className="relative mx-auto max-w-md space-y-4 py-2">
            {b.lessons.map((l, i) => {
              const offset = i % 4;
              const align =
                offset === 0 ? "justify-center" :
                offset === 1 ? "justify-end pr-8" :
                offset === 2 ? "justify-center" :
                "justify-start pl-8";
              return (
                <div key={l.id} className={`flex ${align}`}>
                  <LessonNode lesson={l} />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function LessonNode({ lesson }: { lesson: { id: string; title: string; status: string } }) {
  const isLocked = lesson.status === "locked";
  const isDone = lesson.status === "completed";
  const node = (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full border-4 text-2xl shadow-soft transition ${
          isDone
            ? "border-green-600 bg-green-500 text-white"
            : isLocked
              ? "border-border bg-muted text-muted-foreground"
              : "border-primary bg-primary text-primary-foreground hover:scale-110"
        }`}
      >
        {isDone ? <Check className="h-7 w-7" /> : isLocked ? <Lock className="h-6 w-6" /> : <Star className="h-7 w-7" />}
      </div>
      <span className={`max-w-[10rem] text-center text-xs font-semibold ${isLocked ? "text-muted-foreground" : ""}`}>
        {lesson.title}
      </span>
    </div>
  );
  if (isLocked) return <div className="opacity-60">{node}</div>;
  return (
    <Link to="/lessons/$lessonId" params={{ lessonId: lesson.id }}>
      {node}
    </Link>
  );
}

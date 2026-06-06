import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { BookOpen, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/courses/")({
  component: CoursesList,
});

function CoursesList() {
  const { t, dir } = useI18n();
  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,description,sort_order, lessons(count)")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">{t("courseList")}</h1>
        <p className="mt-1 text-muted-foreground">{t("tagline")}</p>
      </div>

      {isLoading && <p className="text-muted-foreground">{t("loading")}</p>}

      {courses && courses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          {t("noCourses")}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {courses?.map((c) => {
          const count = (c.lessons as unknown as { count: number }[])?.[0]?.count ?? 0;
          return (
            <Link
              key={c.id}
              to="/courses/$courseId"
              params={{ courseId: c.id }}
              className="group bg-card-soft block rounded-2xl border border-border p-6 shadow-soft transition hover:shadow-elegant hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <ChevronLeft className={`h-5 w-5 text-muted-foreground transition group-hover:text-primary ${dir === "ltr" ? "rotate-180" : ""}`} />
              </div>
              <h3 className="mt-4 text-lg font-bold">{c.title}</h3>
              {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
              <div className="mt-4 text-xs text-muted-foreground">{t("lessonsCount")}: {count}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ChevronLeft, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/books/$bookId")({
  component: BookDetail,
});

function BookDetail() {
  const { bookId } = Route.useParams();
  const { t, dir } = useI18n();

  const { data } = useQuery({
    queryKey: ["book", bookId],
    queryFn: async () => {
      const { data: book } = await supabase.from("books").select("*").eq("id", bookId).single();
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id,title,sort_order")
        .eq("book_id", bookId)
        .order("sort_order", { ascending: true });
      return { book, lessons: lessons ?? [] };
    },
  });

  const courseId = data?.book?.course_id;

  return (
    <div>
      {courseId && (
        <Link to="/courses/$courseId" params={{ courseId }}>
          <Button variant="ghost" size="sm" className="mb-4 gap-1">
            <ChevronLeft className={`h-4 w-4 ${dir === "ltr" ? "rotate-180" : ""}`} />
            {t("backToCourse2")}
          </Button>
        </Link>
      )}

      {data?.book && (
        <div className="bg-card-soft mb-8 rounded-2xl border border-border p-8 shadow-soft">
          <h1 className="text-3xl font-extrabold">{data.book.title}</h1>
          {data.book.description && <p className="mt-3 text-muted-foreground">{data.book.description}</p>}
        </div>
      )}

      <h2 className="mb-4 text-xl font-bold">{t("lessons")}</h2>
      {data?.lessons.length === 0 && (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">{t("noLessons")}</div>
      )}
      <div className="space-y-3">
        {data?.lessons.map((l, i) => (
          <Link
            key={l.id}
            to="/lessons/$lessonId"
            params={{ lessonId: l.id }}
            className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition hover:border-primary hover:shadow-soft"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{i + 1}</div>
              <div>
                <div className="font-semibold">{l.title}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <GraduationCap className="h-3 w-3" />
                  {t("lesson")}
                </div>
              </div>
            </div>
            <ChevronLeft className={`h-5 w-5 text-muted-foreground group-hover:text-primary ${dir === "ltr" ? "rotate-180" : ""}`} />
          </Link>
        ))}
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ChevronLeft, BookOpen, Tag, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseProgressBar } from "@/components/ProgressInline";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";

export const Route = createFileRoute("/_authenticated/courses/$courseId")({
  component: CourseDetail,
});

function CourseDetail() {
  const { courseId } = Route.useParams();
  const { t, dir } = useI18n();

  const { data: allCourses } = useQuery({
    queryKey: ["courses-nav"],
    queryFn: async () => (await supabase.from("courses").select("id,title").order("sort_order")).data ?? [],
  });

  const { data } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data: course } = await supabase.from("courses").select("*").eq("id", courseId).single();
      const { data: cats } = await supabase
        .from("book_categories")
        .select("id,title,sort_order")
        .eq("course_id", courseId)
        .order("sort_order");
      const { data: books } = await supabase
        .from("books")
        .select("id,title,description,sort_order,category_id")
        .eq("course_id", courseId)
        .order("sort_order");
      return { course, categories: cats ?? [], books: books ?? [] };
    },
  });

  const renderBook = (b: { id: string; title: string; description: string | null }, i: number) => (
    <Link
      key={b.id}
      to="/books/$bookId"
      params={{ bookId: b.id }}
      className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition hover:border-primary hover:shadow-soft"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{i + 1}</div>
        <div>
          <div className="font-semibold">{b.title}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <BookOpen className="h-3 w-3" />{t("book")}
          </div>
        </div>
      </div>
      <ChevronLeft className={`h-5 w-5 text-muted-foreground group-hover:text-primary ${dir === "ltr" ? "rotate-180" : ""}`} />
    </Link>
  );

  type BookRow = { id: string; title: string; description: string | null; sort_order: number; category_id: string | null };
  const grouped = new Map<string | null, BookRow[]>();
  (data?.books ?? []).forEach(b => {
    const key = b.category_id ?? null;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(b);
  });

  return (
    <div>
      <BreadcrumbNav
        items={[
          {
            label: data?.course?.title ?? t("loading"),
            currentId: courseId,
            siblings: (allCourses ?? []).map(c => ({
              id: c.id,
              label: c.title,
              to: "/courses/$courseId",
              params: { courseId: c.id },
            })),
          },
        ]}
      />


      {data?.course && (
        <div className="bg-card-soft mb-8 rounded-2xl border border-border p-8 shadow-soft">
          <h1 className="text-3xl font-extrabold">{data.course.title}</h1>
          {data.course.description && <p className="mt-3 text-muted-foreground">{data.course.description}</p>}
          <CourseProgressBar courseId={courseId} />
          {data.course.library_url && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="mt-4 gap-2 bg-hero text-primary-foreground">
                  <Library className="h-4 w-4" />
                  {t("libraryButton")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl h-[85vh] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="px-6 py-3 border-b">
                  <DialogTitle>{t("libraryDialogTitle")} — {data.course.title}</DialogTitle>
                </DialogHeader>
                <iframe
                  src={data.course.library_url}
                  className="w-full flex-1 border-0"
                  title={data.course.title}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      <h2 className="mb-4 text-xl font-bold">{t("books")}</h2>
      {data?.books.length === 0 && (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">{t("noBooks")}</div>
      )}

      <div className="space-y-8">
        {data?.categories.map(c => {
          const list = grouped.get(c.id) ?? [];
          if (list.length === 0) return null;
          return (
            <section key={c.id}>
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-primary">
                <Tag className="h-4 w-4" />{c.title}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">{list.map((b, i) => renderBook(b, i))}</div>
            </section>
          );
        })}
        {(grouped.get(null)?.length ?? 0) > 0 && (
          <section>
            {(data?.categories.length ?? 0) > 0 && (
              <h3 className="mb-3 text-base font-bold text-muted-foreground">{t("uncategorized")}</h3>
            )}
            <div className="grid gap-3 sm:grid-cols-2">{grouped.get(null)!.map((b, i) => renderBook(b, i))}</div>
          </section>
        )}
      </div>
    </div>
  );
}

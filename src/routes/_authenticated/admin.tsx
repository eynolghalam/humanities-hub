import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronLeft, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPanel,
});

interface Course { id: string; title: string; description: string | null; sort_order: number }

function AdminPanel() {
  const { isAdmin, loading } = useAuth();
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/courses" });
  }, [loading, isAdmin, navigate]);

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").order("sort_order");
      return (data ?? []) as Course[];
    },
    enabled: isAdmin,
  });

  if (!isAdmin) return <p className="text-muted-foreground">{t("loading")}</p>;

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("OK"); qc.invalidateQueries({ queryKey: ["admin-courses"] }); }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">{t("admin")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("courses")}</p>
        </div>
        <CourseDialog onSaved={() => qc.invalidateQueries({ queryKey: ["admin-courses"] })}>
          <Button className="bg-hero text-primary-foreground gap-2"><Plus className="h-4 w-4" />{t("addCourse")}</Button>
        </CourseDialog>
      </div>

      <div className="space-y-3">
        {courses?.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">{c.title}</div>
                {c.description && <div className="text-xs text-muted-foreground line-clamp-1">{c.description}</div>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/admin/courses/$courseId" params={{ courseId: c.id }}>
                <Button variant="outline" size="sm" className="gap-1">
                  {t("manageLessons")}
                  <ChevronLeft className={`h-4 w-4 ${dir === "ltr" ? "rotate-180" : ""}`} />
                </Button>
              </Link>
              <CourseDialog course={c} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-courses"] })}>
                <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
              </CourseDialog>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {courses?.length === 0 && (
          <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">{t("noCourses")}</div>
        )}
      </div>
    </div>
  );
}

function CourseDialog({ course, children, onSaved }: { course?: Course; children: React.ReactNode; onSaved: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [sortOrder, setSortOrder] = useState(course?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { title, description, sort_order: sortOrder };
    const { error } = course
      ? await supabase.from("courses").update(payload).eq("id", course.id)
      : await supabase.from("courses").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("OK"); onSaved(); setOpen(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{course ? t("editCourse") : t("addCourse")}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2"><Label>{t("title")}</Label><Input required value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t("courseDesc")}</Label><Textarea value={description ?? ""} onChange={e => setDescription(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t("sortOrder")}</Label><Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} dir="ltr" /></div>
          <Button type="submit" disabled={saving} className="w-full bg-hero text-primary-foreground">{saving ? t("loading") : t("save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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

export const Route = createFileRoute("/_authenticated/admin/courses/$courseId")({
  component: ManageBooks,
});

interface Book { id: string; course_id: string; title: string; description: string | null; sort_order: number }

function ManageBooks() {
  const { courseId } = Route.useParams();
  const { isAdmin, loading } = useAuth();
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { if (!loading && !isAdmin) navigate({ to: "/courses" }); }, [loading, isAdmin, navigate]);

  const { data: course } = useQuery({
    queryKey: ["admin-course", courseId],
    queryFn: async () => (await supabase.from("courses").select("*").eq("id", courseId).single()).data,
    enabled: isAdmin,
  });

  const { data: books } = useQuery({
    queryKey: ["admin-books", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("books").select("*").eq("course_id", courseId).order("sort_order");
      return (data ?? []) as Book[];
    },
    enabled: isAdmin,
  });

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("OK"); qc.invalidateQueries({ queryKey: ["admin-books", courseId] }); }
  };

  if (!isAdmin) return <p className="text-muted-foreground">{t("loading")}</p>;

  return (
    <div>
      <Link to="/admin">
        <Button variant="ghost" size="sm" className="mb-4 gap-1">
          <ChevronLeft className={`h-4 w-4 ${dir === "ltr" ? "rotate-180" : ""}`} />
          {t("admin")}
        </Button>
      </Link>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{course?.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("manageBooks")}</p>
        </div>
        <BookDialog courseId={courseId} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-books", courseId] })}>
          <Button className="bg-hero text-primary-foreground gap-2"><Plus className="h-4 w-4" />{t("addBook")}</Button>
        </BookDialog>
      </div>

      <div className="space-y-3">
        {books?.map((b, i) => (
          <div key={b.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{i + 1}</div>
              <div>
                <div className="font-semibold">{b.title}</div>
                {b.description && <div className="text-xs text-muted-foreground line-clamp-1">{b.description}</div>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/admin/books/$bookId" params={{ bookId: b.id }}>
                <Button variant="outline" size="sm" className="gap-1">
                  <BookOpen className="h-4 w-4" />
                  {t("manageLessons")}
                </Button>
              </Link>
              <BookDialog courseId={courseId} book={b} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-books", courseId] })}>
                <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
              </BookDialog>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(b.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {books?.length === 0 && (
          <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">{t("noBooks")}</div>
        )}
      </div>
    </div>
  );
}

function BookDialog({ courseId, book, children, onSaved }: { courseId: string; book?: Book; children: React.ReactNode; onSaved: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(book?.title ?? "");
  const [description, setDescription] = useState(book?.description ?? "");
  const [sortOrder, setSortOrder] = useState(book?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { course_id: courseId, title, description, sort_order: sortOrder };
    const { error } = book
      ? await supabase.from("books").update(payload).eq("id", book.id)
      : await supabase.from("books").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("OK"); onSaved(); setOpen(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{book ? t("editBook") : t("addBook")}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2"><Label>{t("title")}</Label><Input required value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t("bookDesc")}</Label><Textarea value={description ?? ""} onChange={e => setDescription(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t("sortOrder")}</Label><Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} dir="ltr" /></div>
          <Button type="submit" disabled={saving} className="w-full bg-hero text-primary-foreground">{saving ? t("loading") : t("save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

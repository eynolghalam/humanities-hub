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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronLeft, BookOpen, Tag } from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { optimizeImage } from "@/lib/image-optimization";

export const Route = createFileRoute("/_authenticated/admin/courses/$courseId")({
  head: () => ({ meta: [
    { title: "مدیریت کتاب‌ها و جلد | حوزتنا" },
    { name: "description", content: "مدیریت کتاب‌ها و بارگذاری تصویر جلد کتاب در حوزتنا." },
    { property: "og:title", content: "مدیریت کتاب‌ها و جلد | حوزتنا" },
    { property: "og:description", content: "ویرایش کتاب‌ها و جلد آن‌ها در پنل حوزتنا." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ManageBooks,
});

interface Book { id: string; course_id: string; title: string; description: string | null; sort_order: number; category_id: string | null; cover_path: string | null }
interface Category { id: string; course_id: string; title: string; sort_order: number }

function ManageBooks() {
  const { courseId } = Route.useParams();
  const { isAdmin, isTeacher, user, loading } = useAuth();
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { if (!loading && !isAdmin && !isTeacher) navigate({ to: "/courses" }); }, [loading, isAdmin, isTeacher, navigate]);

  // Does the teacher have course-level access?
  const { data: hasCourseAccess } = useQuery({
    queryKey: ["teacher-course-access", user?.id, courseId],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from("teacher_course_access").select("id").eq("teacher_id", user.id).eq("course_id", courseId).maybeSingle();
      return !!data;
    },
    enabled: isTeacher,
  });

  // Which book IDs has the teacher been explicitly granted (book-level)?
  const { data: grantedBookIds } = useQuery({
    queryKey: ["teacher-book-ids", user?.id, courseId],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("teacher_book_access").select("book_id, books!inner(course_id)").eq("teacher_id", user.id).eq("books.course_id", courseId);
      return (data ?? []).map((r: { book_id: string }) => r.book_id);
    },
    enabled: isTeacher,
  });

  const canEditAll = isAdmin || hasCourseAccess === true;

  const { data: course } = useQuery({
    queryKey: ["admin-course", courseId],
    queryFn: async () => (await supabase.from("courses").select("*").eq("id", courseId).single()).data,
    enabled: isAdmin || isTeacher,
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-cats", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("book_categories").select("*").eq("course_id", courseId).order("sort_order");
      return (data ?? []) as Category[];
    },
    enabled: isAdmin || isTeacher,
  });

  const { data: books } = useQuery({
    queryKey: ["admin-books", courseId, canEditAll, grantedBookIds],
    queryFn: async () => {
      let q = supabase.from("books").select("*").eq("course_id", courseId).order("sort_order");
      // For teacher without course-level access, only show explicitly granted books
      if (!isAdmin && isTeacher && !hasCourseAccess) {
        if (!grantedBookIds || grantedBookIds.length === 0) return [] as Book[];
        q = q.in("id", grantedBookIds);
      }
      const { data } = await q;
      return (data ?? []) as Book[];
    },
    enabled: isAdmin || (isTeacher && grantedBookIds !== undefined && hasCourseAccess !== undefined),
  });

  const invalidateCats = () => qc.invalidateQueries({ queryKey: ["admin-cats", courseId] });
  const invalidateBooks = () => {
    qc.invalidateQueries({ queryKey: ["admin-books", courseId] });
    qc.invalidateQueries({ queryKey: ["course", courseId] });
  };

  const deleteBook = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("OK"); invalidateBooks(); }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    const { error } = await supabase.from("book_categories").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("OK"); invalidateCats(); invalidateBooks(); }
  };

  if (!isAdmin && !isTeacher) return <p className="text-muted-foreground">{t("loading")}</p>;

  // Group books by category
  const grouped = new Map<string | null, Book[]>();
  (books ?? []).forEach(b => {
    const key = b.category_id ?? null;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(b);
  });

  const renderBook = (b: Book, i: number) => (
    <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex min-w-0 items-center gap-3">
        <BookCover path={b.cover_path} title={b.title} />
        <div className="min-w-0">
          <div className="font-semibold">{b.title}</div>
          {b.description && <div className="text-xs text-muted-foreground line-clamp-1">{b.description}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/admin/books/$bookId" params={{ bookId: b.id }}>
          <Button variant="outline" size="sm" className="gap-1"><BookOpen className="h-4 w-4" />{t("manageLessons")}</Button>
        </Link>
        <BookDialog courseId={courseId} categories={categories ?? []} book={b} onSaved={invalidateBooks}>
          <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
        </BookDialog>
        <Button size="icon" variant="ghost" onClick={() => deleteBook(b.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      <Link to="/admin">
        <Button variant="ghost" size="sm" className="mb-4 gap-1">
          <ChevronLeft className={`h-4 w-4 ${dir === "ltr" ? "rotate-180" : ""}`} />
          {t("admin")}
        </Button>
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{course?.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("manageBooks")}</p>
        </div>
        <div className="flex gap-2">
          <CategoryDialog courseId={courseId} onSaved={invalidateCats}>
            <Button variant="outline" className="gap-2"><Tag className="h-4 w-4" />{t("addCategory")}</Button>
          </CategoryDialog>
          <BookDialog courseId={courseId} categories={categories ?? []} onSaved={invalidateBooks}>
            <Button className="bg-hero text-primary-foreground gap-2"><Plus className="h-4 w-4" />{t("addBook")}</Button>
          </BookDialog>
        </div>
      </div>

      {canEditAll && course && (
        <LibraryUrlForm courseId={courseId} initial={course.library_url ?? ""} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-course", courseId] })} />
      )}

      {(categories?.length ?? 0) > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-card-soft p-4">
          <h2 className="mb-3 text-sm font-bold text-muted-foreground">{t("manageCategories")}</h2>
          <div className="flex flex-wrap gap-2">
            {categories?.map(c => (
              <div key={c.id} className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-sm">
                <Tag className="h-3 w-3 text-primary" />
                <span>{c.title}</span>
                <CategoryDialog courseId={courseId} category={c} onSaved={invalidateCats}>
                  <button className="ms-1 text-muted-foreground hover:text-primary"><Pencil className="h-3 w-3" /></button>
                </CategoryDialog>
                <button onClick={() => deleteCategory(c.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {categories?.map(c => {
          const list = grouped.get(c.id) ?? [];
          if (list.length === 0) return null;
          return (
            <div key={c.id}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                <Tag className="h-4 w-4" />{c.title}
              </h3>
              <div className="space-y-3">{list.map((b, i) => renderBook(b, i))}</div>
            </div>
          );
        })}
        {(grouped.get(null)?.length ?? 0) > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-bold text-muted-foreground">{t("uncategorized")}</h3>
            <div className="space-y-3">{grouped.get(null)?.map((b, i) => renderBook(b, i))}</div>
          </div>
        )}
        {books?.length === 0 && (
          <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">{t("noBooks")}</div>
        )}
      </div>
    </div>
  );
}

function BookDialog({ courseId, categories, book, children, onSaved }: { courseId: string; categories: Category[]; book?: Book; children: React.ReactNode; onSaved: () => void }) {
  const { t } = useI18n();
  const { isOwner } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(book?.title ?? "");
  const [description, setDescription] = useState(book?.description ?? "");
  const [sortOrder, setSortOrder] = useState(book?.sort_order ?? 0);
  const [categoryId, setCategoryId] = useState<string | null>(book?.category_id ?? null);
  const [saving, setSaving] = useState(false);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [savedBookId, setSavedBookId] = useState(book?.id ?? null);
  useEffect(() => {
    if (!coverFile) { setPreview(null); return; }
    const url = URL.createObjectURL(coverFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let uploadedPath: string | null = null;
    try {
      const payload = { course_id: courseId, title, description, sort_order: sortOrder, category_id: categoryId };
      const result = savedBookId
        ? await supabase.from("books").update(payload).eq("id", savedBookId).select("id").single()
        : await supabase.from("books").insert(payload).select("id").single();
      if (result.error) throw result.error;
      const id = result.data.id;
      setSavedBookId(id);
      if (!isOwner && (coverFile || removeCover)) throw new Error('فقط مالک می‌تواند جلد کتاب را تغییر دهد.');
      let path = removeCover ? null : book?.cover_path ?? null;
      if (coverFile) {
        const optimized = await optimizeImage(coverFile, 'cover');
        uploadedPath = `${id}/${crypto.randomUUID()}.webp`;
        const { error } = await supabase.storage.from("book-covers").upload(uploadedPath, optimized, { contentType: optimized.type });
        if (error) throw error;
        path = uploadedPath;
      }
      if (isOwner && (coverFile || removeCover)) {
        const { error } = await supabase.from("books").update({ cover_path: path }).eq("id", id).select("id").single();
        if (error) throw error;
      }
      if (book?.cover_path && book.cover_path !== path) await supabase.storage.from("book-covers").remove([book.cover_path]);
      toast.success("کتاب ذخیره شد");
      onSaved();
      setCoverFile(null); setRemoveCover(false); setOpen(false);
      if (!book) { setSavedBookId(null); setTitle(""); setDescription(""); }
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("book-covers").remove([uploadedPath]);
      onSaved();
      toast.error(error instanceof Error ? error.message : "ذخیرهٔ کتاب یا جلد انجام نشد؛ دوباره تلاش کنید.");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{book ? t("editBook") : t("addBook")}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2"><Label>{t("title")}</Label><Input required value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t("bookDesc")}</Label><Textarea value={description ?? ""} onChange={e => setDescription(e.target.value)} /></div>
          <div className="space-y-3">
            <Label htmlFor={`cover-${book?.id ?? "new"}`}>تصویر جلد کتاب</Label>
            {preview ? <img src={preview} alt="پیش‌نمایش جلد کتاب" className="h-32 w-24 rounded-md border border-border object-contain" /> : !removeCover && book?.cover_path ? <BookCover path={book.cover_path} title={title} /> : null}
            {isOwner && <Input id={`cover-${book?.id ?? "new"}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 30 * 1024 * 1024) {
                toast.error("تصویر JPG، PNG یا WebP تا ۳۰ مگابایت انتخاب کنید."); e.target.value = ""; return;
              }
              setCoverFile(file); setRemoveCover(false);
            }} />}
            {isOwner && (coverFile || (book?.cover_path && !removeCover)) && <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => { setCoverFile(null); setRemoveCover(true); }}>حذف جلد</Button>}
          </div>
          <div className="space-y-2">
            <Label>{t("category")}</Label>
            <Select value={categoryId ?? "__none"} onValueChange={v => setCategoryId(v === "__none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder={t("selectCategory")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">{t("uncategorized")}</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>{t("sortOrder")}</Label><Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} dir="ltr" /></div>
          <Button type="submit" disabled={saving} className="w-full bg-hero text-primary-foreground">{saving ? t("loading") : t("save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({ courseId, category, children, onSaved }: { courseId: string; category?: Category; children: React.ReactNode; onSaved: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(category?.title ?? "");
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { course_id: courseId, title, sort_order: sortOrder };
    const { error } = category
      ? await supabase.from("book_categories").update(payload).eq("id", category.id)
      : await supabase.from("book_categories").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("OK"); onSaved(); setOpen(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{category ? t("editCategory") : t("addCategory")}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2"><Label>{t("title")}</Label><Input required value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t("sortOrder")}</Label><Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} dir="ltr" /></div>
          <Button type="submit" disabled={saving} className="w-full bg-hero text-primary-foreground">{saving ? t("loading") : t("save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LibraryUrlForm({ courseId, initial, onSaved }: { courseId: string; initial: string; onSaved: () => void }) {
  const { t } = useI18n();
  const [url, setUrl] = useState(initial);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("courses").update({ library_url: url || null }).eq("id", courseId);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("OK"); onSaved(); }
  };

  return (
    <form onSubmit={save} className="mb-6 rounded-2xl border border-border bg-card-soft p-4 space-y-2">
      <Label className="text-sm font-bold">{t("libraryUrl")}</Label>
      <p className="text-xs text-muted-foreground">{t("libraryUrlHelp")}</p>
      <div className="flex gap-2">
        <Input dir="ltr" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.ghbook.ir/read/fa-IR/796" />
        <Button type="submit" disabled={saving}>{t("save")}</Button>
      </div>
    </form>
  );
}

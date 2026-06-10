import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { splitBookIntoLessons } from "@/lib/book-import.functions";
import { fetchDarsgoftarSession, listDarsgoftarSessions, importDarsgoftarBook, fetchDarsgoftarBookPages } from "@/lib/darsgoftar.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronLeft, Sparkles, BookDown, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/books/$bookId")({
  component: ManageLessons,
});

interface Lesson {
  id: string; book_id: string | null; course_id: string; title: string; content: string | null;
  video_embed: string | null; audio_url: string | null; slide_url: string | null; sort_order: number;
  original_text: string | null; translation: string | null; explanation: string | null;
}

function ManageLessons() {
  const { bookId } = Route.useParams();
  const { isAdmin, isTeacher, user, loading } = useAuth();
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { if (!loading && !isAdmin && !isTeacher) navigate({ to: "/courses" }); }, [loading, isAdmin, isTeacher, navigate]);

  const { data: book } = useQuery({
    queryKey: ["admin-book", bookId],
    queryFn: async () => (await supabase.from("books").select("*, courses(id,title)").eq("id", bookId).single()).data,
    enabled: isAdmin || isTeacher,
  });

  const { data: lessons } = useQuery({
    queryKey: ["admin-lessons-book", bookId],
    queryFn: async () => {
      const { data } = await supabase.from("lessons").select("*").eq("book_id", bookId).order("sort_order");
      return (data ?? []) as Lesson[];
    },
    enabled: isAdmin || isTeacher,
  });

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("OK"); qc.invalidateQueries({ queryKey: ["admin-lessons-book", bookId] }); }
  };

  if (!isAdmin && !isTeacher) return <p className="text-muted-foreground">{t("loading")}</p>;

  const canEdit = (l: Lesson) => isAdmin || (isTeacher && (l as Lesson & { created_by?: string | null }).created_by === user?.id);

  const courseId = book?.course_id;

  return (
    <div>
      {courseId && (
        <Link to="/admin/courses/$courseId" params={{ courseId }}>
          <Button variant="ghost" size="sm" className="mb-4 gap-1">
            <ChevronLeft className={`h-4 w-4 ${dir === "ltr" ? "rotate-180" : ""}`} />
            {t("manageBooks")}
          </Button>
        </Link>
      )}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{book?.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("manageLessons")}</p>
        </div>
        {courseId && (
          <div className="flex items-center gap-2">
            <ImportFromTextDialog bookId={bookId} courseId={courseId} existingCount={lessons?.length ?? 0} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-lessons-book", bookId] })}>
              <Button variant="outline" className="gap-2"><Sparkles className="h-4 w-4" />{t("importFromText")}</Button>
            </ImportFromTextDialog>
            <ImportFromDarsgoftarDialog bookId={bookId} courseId={courseId} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-lessons-book", bookId] })}>
              <Button variant="outline" className="gap-2"><BookDown className="h-4 w-4" />درس‌گفتار</Button>
            </ImportFromDarsgoftarDialog>
            <LessonDialog bookId={bookId} courseId={courseId} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-lessons-book", bookId] })}>
              <Button className="bg-hero text-primary-foreground gap-2"><Plus className="h-4 w-4" />{t("addLesson")}</Button>
            </LessonDialog>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {lessons?.map((l, i) => (
          <div key={l.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{i + 1}</div>
              <div>
                <div className="font-semibold">{l.title}</div>
                {isTeacher && canEdit(l) && <div className="text-xs text-primary">{t("addedByYou")}</div>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {courseId && canEdit(l) && (
                <LessonDialog bookId={bookId} courseId={courseId} lesson={l} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-lessons-book", bookId] })}>
                  <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                </LessonDialog>
              )}
              {canEdit(l) && (
                <Button size="icon" variant="ghost" onClick={() => handleDelete(l.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {lessons?.length === 0 && (
          <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">{t("noLessons")}</div>
        )}
      </div>
    </div>
  );
}

function LessonDialog({ bookId, courseId, lesson, children, onSaved }: { bookId: string; courseId: string; lesson?: Lesson; children: React.ReactNode; onSaved: () => void }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [originalText, setOriginalText] = useState(lesson?.original_text ?? "");
  const [translation, setTranslation] = useState(lesson?.translation ?? "");
  const [explanation, setExplanation] = useState(lesson?.explanation ?? "");
  const [content, setContent] = useState(lesson?.content ?? "");
  const [videoEmbed, setVideoEmbed] = useState(lesson?.video_embed ?? "");
  const [sortOrder, setSortOrder] = useState(lesson?.sort_order ?? 0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [slideFile, setSlideFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const upload = async (bucket: string, file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${bookId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    return path;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let audio_url = lesson?.audio_url ?? null;
      let slide_url = lesson?.slide_url ?? null;
      if (audioFile) audio_url = await upload("lesson-audio", audioFile);
      if (slideFile) slide_url = await upload("lesson-slides", slideFile);

      const basePayload = { course_id: courseId, book_id: bookId, title, content, original_text: originalText, translation, explanation, video_embed: videoEmbed, audio_url, slide_url, sort_order: sortOrder };
      const { error } = lesson
        ? await supabase.from("lessons").update(basePayload).eq("id", lesson.id)
        : await supabase.from("lessons").insert({ ...basePayload, created_by: user?.id });
      if (error) throw error;
      toast.success("OK");
      onSaved();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{lesson ? t("editLesson") : t("addLesson")}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2"><Label>{t("title")}</Label><Input required value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t("originalText")}</Label><Textarea rows={5} value={originalText} onChange={e => setOriginalText(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t("translation")}</Label><Textarea rows={5} value={translation} onChange={e => setTranslation(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t("explanation")}</Label><Textarea rows={5} value={explanation} onChange={e => setExplanation(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t("content")}</Label><Textarea rows={6} value={content} onChange={e => setContent(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t("videoEmbed")}</Label><Textarea rows={3} value={videoEmbed} onChange={e => setVideoEmbed(e.target.value)} dir="ltr" placeholder='<iframe src="..."></iframe>' /></div>
          <div className="space-y-2">
            <Label>{t("audioFile")}</Label>
            <Input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] ?? null)} />
            {lesson?.audio_url && !audioFile && <p className="text-xs text-muted-foreground">{lesson.audio_url}</p>}
          </div>
          <div className="space-y-2">
            <Label>{t("slideFile")}</Label>
            <Input type="file" accept="application/pdf,image/*" onChange={e => setSlideFile(e.target.files?.[0] ?? null)} />
            {lesson?.slide_url && !slideFile && <p className="text-xs text-muted-foreground">{lesson.slide_url}</p>}
          </div>
          <div className="space-y-2"><Label>{t("sortOrder")}</Label><Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} dir="ltr" /></div>
          <Button type="submit" disabled={saving} className="w-full bg-hero text-primary-foreground">{saving ? t("uploading") : t("save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DraftLesson { title: string; original_text: string; translation: string; explanation: string }

function ImportFromTextDialog({ bookId, courseId, existingCount, children, onSaved }: { bookId: string; courseId: string; existingCount: number; children: React.ReactNode; onSaved: () => void }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const splitFn = useServerFn(splitBookIntoLessons);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<DraftLesson[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const res = await splitFn({ data: { text } });
      if (!res.lessons.length) { toast.error(t("nothingExtracted")); return; }
      setDrafts(res.lessons);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally { setAnalyzing(false); }
  };

  const importAll = async () => {
    setImporting(true);
    try {
      const rows = drafts.map((d, i) => ({
        course_id: courseId,
        book_id: bookId,
        title: d.title,
        original_text: d.original_text,
        translation: d.translation,
        explanation: d.explanation,
        sort_order: existingCount + i,
        created_by: user?.id,
      }));
      const { error } = await supabase.from("lessons").insert(rows);
      if (error) throw error;
      toast.success(`${drafts.length} ${t("importedCount")}`);
      onSaved();
      setOpen(false);
      setDrafts([]); setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally { setImporting(false); }
  };

  const updateDraft = (i: number, patch: Partial<DraftLesson>) => {
    setDrafts(prev => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d));
  };
  const removeDraft = (i: number) => setDrafts(prev => prev.filter((_, idx) => idx !== i));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{t("importFromText")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("importBookHelp")}</p>
          {drafts.length === 0 ? (
            <>
              <div className="space-y-2">
                <Label>{t("bookFullText")}</Label>
                <Textarea rows={14} value={text} onChange={e => setText(e.target.value)} placeholder="..." />
              </div>
              <Button onClick={analyze} disabled={analyzing || text.trim().length < 20} className="w-full bg-hero text-primary-foreground gap-2">
                <Sparkles className="h-4 w-4" />
                {analyzing ? t("analyzing") : t("importFromText")}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{t("previewLessons")} ({drafts.length})</h3>
                <Button variant="ghost" size="sm" onClick={() => setDrafts([])}>{t("cancel")}</Button>
              </div>
              <div className="space-y-3">
                {drafts.map((d, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                      <Input value={d.title} onChange={e => updateDraft(i, { title: e.target.value })} className="flex-1" />
                      <Button size="icon" variant="ghost" onClick={() => removeDraft(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                    <Textarea rows={3} placeholder={t("originalText")} value={d.original_text} onChange={e => updateDraft(i, { original_text: e.target.value })} />
                    <Textarea rows={2} placeholder={t("translation")} value={d.translation} onChange={e => updateDraft(i, { translation: e.target.value })} />
                    <Textarea rows={2} placeholder={t("explanation")} value={d.explanation} onChange={e => updateDraft(i, { explanation: e.target.value })} />
                  </div>
                ))}
              </div>
              <Button onClick={importAll} disabled={importing} className="w-full bg-hero text-primary-foreground">
                {importing ? t("uploading") : `${t("importAll")} (${drafts.length})`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DgSession { url: string; number: string; title: string }

function ImportFromDarsgoftarDialog({ bookId, courseId, children, onSaved }: { bookId: string; courseId: string; children: React.ReactNode; onSaved: () => void }) {
  const fetchSessionFn = useServerFn(fetchDarsgoftarSession);
  const listFn = useServerFn(listDarsgoftarSessions);
  const importFn = useServerFn(importDarsgoftarBook);
  const fetchBookPagesFn = useServerFn(fetchDarsgoftarBookPages);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"single" | "bulk" | "booktext">("single");
  const [url, setUrl] = useState("");
  const [mbookId, setMbookId] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ sessionTitle: string; combinedHtml: string; boxesCount: number } | null>(null);
  const [sessions, setSessions] = useState<DgSession[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // book-text mode state
  const [bookStartUrl, setBookStartUrl] = useState("");
  const [bookMaxPages, setBookMaxPages] = useState(50);
  const [bookSaveMode, setBookSaveMode] = useState<"combined" | "perPage">("combined");
  const [bookLessonTitle, setBookLessonTitle] = useState("");
  const [bookPages, setBookPages] = useState<Array<{ url: string; pageNum: string; html: string; text: string }>>([]);
  const [bookFetchedTitle, setBookFetchedTitle] = useState("");

  const reset = () => { setPreview(null); setSessions([]); setProgress(null); setBookPages([]); setBookFetchedTitle(""); };


  const loadSingle = async () => {
    setLoading(true);
    try {
      const res = await fetchSessionFn({ data: { url: url.trim() } });
      setPreview({ sessionTitle: res.sessionTitle, combinedHtml: res.combinedHtml, boxesCount: res.boxes.length });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  };

  const saveSingle = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("book_id", bookId);
      const { error } = await supabase.from("lessons").insert({
        course_id: courseId, book_id: bookId, title: preview.sessionTitle || "جلسه جدید",
        explanation: preview.combinedHtml, sort_order: count ?? 0,
      });
      if (error) throw error;
      toast.success("درس اضافه شد");
      onSaved(); setOpen(false); reset(); setUrl("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  };

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await listFn({ data: { mbookId: mbookId.trim() } });
      setSessions(res.sessions);
      if (!res.sessions.length) toast.error("جلسه‌ای پیدا نشد");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  };

  const importAll = async () => {
    setLoading(true); setProgress({ done: 0, total: sessions.length });
    try {
      let start = 0; let inserted = 0;
      while (true) {
        const res = await importFn({ data: { mbookId: mbookId.trim(), bookId, courseId, startIndex: start, limit: 10 } });
        inserted += res.inserted;
        setProgress({ done: Math.min(res.nextStart, res.total), total: res.total });
        if (!res.hasMore) break;
        start = res.nextStart;
      }
      toast.success(`${inserted} درس وارد شد`);
      onSaved(); setOpen(false); reset(); setMbookId(""); setSessions([]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); setProgress(null); }
  };

  const loadBookPages = async () => {
    setLoading(true);
    try {
      const collected: typeof bookPages = [];
      let nextUrl: string | null = bookStartUrl.trim();
      let title = "";
      const cap = Math.min(bookMaxPages, 500);
      while (nextUrl && collected.length < cap) {
        const remaining = cap - collected.length;
        const res: { bookTitle: string; pages: typeof bookPages; nextUrl: string | null } =
          await fetchBookPagesFn({ data: { startUrl: nextUrl, limit: Math.min(remaining, 15) } });
        if (!title) title = res.bookTitle;
        collected.push(...res.pages);
        setProgress({ done: collected.length, total: cap });
        if (!res.nextUrl || res.pages.length === 0) { nextUrl = null; break; }
        nextUrl = res.nextUrl;
      }
      setBookFetchedTitle(title);
      setBookPages(collected);
      if (!bookLessonTitle && title) setBookLessonTitle(title);
      if (!collected.length) toast.error("صفحه‌ای استخراج نشد");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); setProgress(null); }
  };

  const saveBookPages = async () => {
    if (!bookPages.length) return;
    setLoading(true);
    try {
      const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("book_id", bookId);
      const base = count ?? 0;
      if (bookSaveMode === "combined") {
        const combinedHtml = bookPages
          .filter(p => p.html)
          .map(p => `<section class="dg-page" data-page="${p.pageNum}"><div class="dg-pagenum">صفحه ${p.pageNum}</div>${p.html}</section>`)
          .join("\n");
        const { error } = await supabase.from("lessons").insert({
          course_id: courseId, book_id: bookId,
          title: bookLessonTitle.trim() || bookFetchedTitle || "متن کتاب",
          original_text: combinedHtml,
          sort_order: base,
        });
        if (error) throw error;
        toast.success(`${bookPages.length} صفحه به‌صورت یک درس اضافه شد`);
      } else {
        const rows = bookPages.filter(p => p.html).map((p, i) => ({
          course_id: courseId, book_id: bookId,
          title: `${bookLessonTitle.trim() || bookFetchedTitle || "صفحه"} — صفحه ${p.pageNum}`,
          original_text: p.html,
          sort_order: base + i,
        }));
        if (rows.length) {
          const { error } = await supabase.from("lessons").insert(rows);
          if (error) throw error;
        }
        toast.success(`${rows.length} درس اضافه شد`);
      }
      onSaved(); setOpen(false); reset(); setBookStartUrl(""); setBookLessonTitle("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  };


  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { reset(); } }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>وارد کردن توضیح درس از درس‌گفتار</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <Button type="button" size="sm" variant={mode === "single" ? "default" : "outline"} onClick={() => { setMode("single"); reset(); }}>یک جلسه (توضیح استاد)</Button>
            <Button type="button" size="sm" variant={mode === "bulk" ? "default" : "outline"} onClick={() => { setMode("bulk"); reset(); }}>کل توضیحات کتاب</Button>
            <Button type="button" size="sm" variant={mode === "booktext" ? "default" : "outline"} onClick={() => { setMode("booktext"); reset(); }}>متن کتاب</Button>
          </div>


          {mode === "single" && (
            <>
              <div className="space-y-2">
                <Label>آدرس جلسه (مثال: https://darsgoftar.net/mbook/12/176)</Label>
                <Input dir="ltr" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://darsgoftar.net/mbook/.../..." />
              </div>
              {!preview ? (
                <Button onClick={loadSingle} disabled={loading || !url.trim()} className="w-full bg-hero text-primary-foreground gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookDown className="h-4 w-4" />}
                  پیش‌نمایش
                </Button>
              ) : (
                <>
                  <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <div className="font-bold">{preview.sessionTitle}</div>
                    <div className="text-xs text-muted-foreground">{preview.boxesCount} بخش استخراج شد</div>
                    <div className="max-h-64 overflow-y-auto text-sm rich-content" dangerouslySetInnerHTML={{ __html: preview.combinedHtml }} />
                  </div>
                  <Button onClick={saveSingle} disabled={loading} className="w-full bg-hero text-primary-foreground">
                    افزودن به‌عنوان درس
                  </Button>
                </>
              )}
            </>
          )}

          {mode === "bulk" && (
            <>
              <div className="space-y-2">
                <Label>شناسه کتاب در درس‌گفتار (mbook ID — مثلا برای /mbook/12 عدد 12)</Label>
                <Input dir="ltr" value={mbookId} onChange={e => setMbookId(e.target.value.replace(/\D/g, ""))} placeholder="12" />
              </div>
              {sessions.length === 0 ? (
                <Button onClick={loadList} disabled={loading || !mbookId.trim()} className="w-full bg-hero text-primary-foreground gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookDown className="h-4 w-4" />}
                  دریافت فهرست جلسات
                </Button>
              ) : (
                <>
                  <div className="text-sm">تعداد جلسات یافت‌شده: <b>{sessions.length}</b></div>
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y">
                    {sessions.slice(0, 100).map(s => (
                      <div key={s.url} className="px-3 py-2 text-sm flex gap-2">
                        <span className="text-muted-foreground">{s.number}</span>
                        <span>{s.title}</span>
                      </div>
                    ))}
                    {sessions.length > 100 && <div className="px-3 py-2 text-xs text-muted-foreground">و {sessions.length - 100} جلسه دیگر…</div>}
                  </div>
                  {progress && (
                    <div className="text-xs text-muted-foreground">در حال وارد کردن: {progress.done} / {progress.total}</div>
                  )}
                  <Button onClick={importAll} disabled={loading} className="w-full bg-hero text-primary-foreground gap-2">
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    وارد کردن همه ({sessions.length})
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


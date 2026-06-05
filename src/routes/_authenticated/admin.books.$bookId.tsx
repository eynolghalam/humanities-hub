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
import { Plus, Pencil, Trash2, ChevronLeft } from "lucide-react";

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
          <LessonDialog bookId={bookId} courseId={courseId} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-lessons-book", bookId] })}>
            <Button className="bg-hero text-primary-foreground gap-2"><Plus className="h-4 w-4" />{t("addLesson")}</Button>
          </LessonDialog>
        )}
      </div>

      <div className="space-y-3">
        {lessons?.map((l, i) => (
          <div key={l.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{i + 1}</div>
              <div className="font-semibold">{l.title}</div>
            </div>
            <div className="flex items-center gap-2">
              {courseId && (
                <LessonDialog bookId={bookId} courseId={courseId} lesson={l} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-lessons-book", bookId] })}>
                  <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                </LessonDialog>
              )}
              <Button size="icon" variant="ghost" onClick={() => handleDelete(l.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
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

      const payload = { course_id: courseId, book_id: bookId, title, content, original_text: originalText, translation, explanation, video_embed: videoEmbed, audio_url, slide_url, sort_order: sortOrder };
      const { error } = lesson
        ? await supabase.from("lessons").update(payload).eq("id", lesson.id)
        : await supabase.from("lessons").insert(payload);
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

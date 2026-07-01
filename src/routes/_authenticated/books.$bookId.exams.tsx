import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronLeft, Upload, Trash2, Sparkles, FileText, Loader2, Eye, ImageIcon } from "lucide-react";
import { answerBookExamFromFiles, generateBookExamQuestions } from "@/lib/exam.functions";

export const Route = createFileRoute("/_authenticated/books/$bookId/exams")({
  component: ExamsPage,
});

function ExamsPage() {
  const { bookId } = Route.useParams();
  const { user, isAdmin, isTeacher } = useAuth();
  const qc = useQueryClient();
  const canManage = isAdmin || isTeacher;

  const answerFn = useServerFn(answerBookExamFromFiles);
  const generateFn = useServerFn(generateBookExamQuestions);

  const { data: book } = useQuery({
    queryKey: ["book-basic", bookId],
    queryFn: async () => (await supabase.from("books").select("id,title,course_id").eq("id", bookId).single()).data,
  });

  const { data: files } = useQuery({
    queryKey: ["exam-files", bookId],
    queryFn: async () => {
      const { data } = await supabase.from("book_exam_files").select("*").eq("book_id", bookId).order("created_at");
      return data ?? [];
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["exam-questions", bookId],
    queryFn: async () => {
      const { data } = await supabase.from("book_exam_questions").select("*").eq("book_id", bookId).order("sort_order");
      return data ?? [];
    },
  });

  const [uploading, setUploading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(list)) {
        const ext = file.name.split(".").pop();
        const path = `${bookId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("exam-files").upload(path, file);
        if (error) throw error;
        const { error: insErr } = await supabase.from("book_exam_files").insert({
          book_id: bookId, file_path: path, file_type: file.type, title: file.name, uploaded_by: user?.id,
        });
        if (insErr) throw insErr;
      }
      toast.success("فایل‌ها بارگذاری شدند");
      qc.invalidateQueries({ queryKey: ["exam-files", bookId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در بارگذاری");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const deleteFile = async (id: string, path: string) => {
    if (!confirm("حذف این فایل؟")) return;
    await supabase.storage.from("exam-files").remove([path]);
    await supabase.from("book_exam_files").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["exam-files", bookId] });
  };

  const viewAnswer = async () => {
    if (!files || files.length === 0) { toast.error("ابتدا فایل بارگذاری کنید."); return; }
    setBusy(true); setAnswer(null);
    try {
      const res = await answerFn({ data: { bookId, filePaths: files.map(f => f.file_path) } });
      setAnswer(res.answer);
      if (res.skippedPdf > 0) toast.warning(`${res.skippedPdf} فایل PDF نادیده گرفته شد (فعلاً فقط تصویر پشتیبانی می‌شود).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally { setBusy(false); }
  };

  const generateQuestions = async () => {
    if (!confirm("سوال‌های قبلی جایگزین می‌شوند. ادامه؟")) return;
    setGenerating(true);
    try {
      const res = await generateFn({ data: { bookId } });
      toast.success(`${res.count} سوال ساخته شد`);
      qc.invalidateQueries({ queryKey: ["exam-questions", bookId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally { setGenerating(false); }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/books/$bookId" params={{ bookId }}>
        <Button variant="ghost" size="sm" className="mb-4 gap-1">
          <ChevronLeft className="h-4 w-4" />
          بازگشت به کتاب
        </Button>
      </Link>

      <h1 className="mb-2 text-3xl font-extrabold">سوالات امتحانی</h1>
      {book && <p className="mb-8 text-muted-foreground">{book.title}</p>}

      {/* Part 1: upload & view answer */}
      <section className="bg-card-soft mb-6 rounded-2xl border border-border p-6 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><ImageIcon className="h-4 w-4 text-primary" /></div>
          <h2 className="text-lg font-bold">۱. آپلود برگه امتحانی و مشاهده پاسخ AI</h2>
        </div>

        {canManage && (
          <div className="mb-4">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 hover:border-primary">
              <Upload className="h-5 w-5" />
              <span className="text-sm">{uploading ? "در حال بارگذاری…" : "انتخاب فایل تصویر یا PDF (چند فایل مجاز است)"}</span>
              <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        )}

        <div className="mb-4 space-y-2">
          {files?.length === 0 && <p className="text-sm text-muted-foreground">فایلی بارگذاری نشده.</p>}
          {files?.map(f => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{f.title ?? f.file_path.split("/").pop()}</span>
                <span className="text-xs text-muted-foreground">({f.file_type})</span>
              </div>
              {canManage && (
                <Button size="icon" variant="ghost" onClick={() => deleteFile(f.id, f.file_path)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button onClick={viewAnswer} disabled={busy || !files || files.length === 0} className="w-full bg-hero text-primary-foreground gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          مشاهده پاسخ (با هوش مصنوعی)
        </Button>

        {answer && (
          <div className="mt-6 rounded-xl border border-border bg-background p-4">
            <h3 className="mb-3 font-bold">پاسخ‌ها:</h3>
            <div
              className="rich-content whitespace-pre-wrap text-sm leading-loose"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(markdownToHtml(answer)) }}
            />
          </div>
        )}
      </section>

      {/* Part 2: 40 generated questions */}
      <section className="bg-card-soft rounded-2xl border border-border p-6 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><Sparkles className="h-4 w-4 text-primary" /></div>
            <h2 className="text-lg font-bold">۲. ۴۰ سوال مهم استخراج‌شده از کتاب</h2>
          </div>
          {canManage && (
            <Button onClick={generateQuestions} disabled={generating} variant="outline" size="sm" className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {questions && questions.length > 0 ? "بازتولید" : "استخراج ۴۰ سوال"}
            </Button>
          )}
        </div>

        {(!questions || questions.length === 0) ? (
          <p className="text-sm text-muted-foreground">هنوز سوالی استخراج نشده.</p>
        ) : (
          <ol className="space-y-3 list-decimal pr-6">
            {questions.map((q) => (
              <li key={q.id} className="rounded-lg border border-border bg-card p-3 leading-loose">
                {q.question}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* silence unused Input import warning */}
      <div className="hidden"><Input /></div>
    </div>
  );
}

// Minimal Markdown → HTML (headings, bold, line breaks)
function markdownToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let html = esc(md);
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;
  return html;
}

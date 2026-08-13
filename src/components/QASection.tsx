import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircleQuestion, Send, CheckCircle2, User2, GraduationCap, BookOpen } from "lucide-react";
import { toast } from "sonner";

export type QAScope = {
  lessonId?: string | null;
  bookId?: string | null;
  courseId?: string | null;
};

type QuestionRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
  lesson_id: string | null;
  book_id: string | null;
  course_id: string | null;
};

type ContextMap = {
  courses: Record<string, string>;
  books: Record<string, string>;
  lessons: Record<string, string>;
};

const fmt = (d: string) => new Date(d).toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "short" });

function scopeKey(scope: QAScope) {
  return `${scope.lessonId ?? ""}|${scope.bookId ?? ""}|${scope.courseId ?? ""}`;
}

export function QASection({
  scope = {},
  showAll = false,
  title = "پرسش و پاسخ با استاد",
}: {
  scope?: QAScope;
  showAll?: boolean;
  title?: string;
}) {
  const { user, isAdmin, isTeacher, isOwner } = useAuth();
  const isStaff = isAdmin || isTeacher || isOwner;
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [open, setOpen] = useState(false);

  const queryKey = ["questions", scopeKey(scope), showAll, isStaff];

  const { data: questions } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase
        .from("questions")
        .select("id,user_id,title,body,status,created_at,lesson_id,book_id,course_id")
        .order("created_at", { ascending: false });
      if (!showAll) {
        if (scope.lessonId) q = q.eq("lesson_id", scope.lessonId);
        else if (scope.bookId) q = q.eq("book_id", scope.bookId);
        else if (scope.courseId) q = q.eq("course_id", scope.courseId);
        else q = q.is("lesson_id", null).is("book_id", null).is("course_id", null);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as QuestionRow[];
    },
  });

  const askerIds = Array.from(new Set((questions ?? []).map(q => q.user_id)));
  const { data: names } = useQuery({
    queryKey: ["qa-profiles", askerIds.join(",")],
    enabled: isStaff && askerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name").in("id", askerIds);
      const map: Record<string, string> = {};
      (data ?? []).forEach(p => { map[p.id] = p.full_name || "کاربر"; });
      return map;
    },
  });

  const courseIds = Array.from(new Set((questions ?? []).map(q => q.course_id).filter(Boolean))) as string[];
  const bookIds = Array.from(new Set((questions ?? []).map(q => q.book_id).filter(Boolean))) as string[];
  const lessonIds = Array.from(new Set((questions ?? []).map(q => q.lesson_id).filter(Boolean))) as string[];
  const { data: contextMap } = useQuery({
    queryKey: ["qa-context", courseIds.join(","), bookIds.join(","), lessonIds.join(",")],
    enabled: showAll && (courseIds.length > 0 || bookIds.length > 0 || lessonIds.length > 0),
    queryFn: async (): Promise<ContextMap> => {
      const [coursesRes, booksRes, lessonsRes] = await Promise.all([
        courseIds.length > 0 ? supabase.from("courses").select("id,title").in("id", courseIds) : Promise.resolve({ data: [] }),
        bookIds.length > 0 ? supabase.from("books").select("id,title").in("id", bookIds) : Promise.resolve({ data: [] }),
        lessonIds.length > 0 ? supabase.from("lessons").select("id,title").in("id", lessonIds) : Promise.resolve({ data: [] }),
      ]);
      const courses: Record<string, string> = {};
      const books: Record<string, string> = {};
      const lessons: Record<string, string> = {};
      (coursesRes.data ?? []).forEach(r => { courses[r.id] = r.title; });
      (booksRes.data ?? []).forEach(r => { books[r.id] = r.title; });
      (lessonsRes.data ?? []).forEach(r => { lessons[r.id] = r.title; });
      return { courses, books, lessons };
    },
  });

  const ask = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("ابتدا وارد شوید");
      const { error } = await supabase.from("questions").insert({
        user_id: user.id,
        title: newTitle.trim(),
        body: newBody.trim(),
        lesson_id: scope.lessonId ?? null,
        book_id: scope.bookId ?? null,
        course_id: scope.courseId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewTitle(""); setNewBody(""); setOpen(false);
      toast.success("پرسش شما ثبت شد");
      qc.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="bg-card-soft mb-6 rounded-2xl border border-border p-6 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <MessageCircleQuestion className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        {!isStaff && (
          <Button size="sm" variant={open ? "ghost" : "default"} onClick={() => setOpen(o => !o)}>
            {open ? "انصراف" : "پرسش جدید"}
          </Button>
        )}
      </div>

      {open && (
        <div className="mb-6 space-y-3 rounded-xl border border-border bg-card p-4">
          <Input placeholder="عنوان پرسش" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <Textarea rows={4} placeholder="متن پرسش خود را بنویسید…" value={newBody} onChange={e => setNewBody(e.target.value)} />
          <Button
            disabled={!newTitle.trim() || !newBody.trim() || ask.isPending}
            onClick={() => ask.mutate()}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            ارسال پرسش
          </Button>
        </div>
      )}

      {(questions?.length ?? 0) === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          هنوز پرسشی ثبت نشده است.
        </p>
      ) : (
        <div className="space-y-3">
          {questions!.map(q => (
            <QuestionThread
              key={q.id}
              question={q}
              askerName={names?.[q.user_id]}
              isStaff={isStaff}
              currentUserId={user?.id ?? null}
              contextMap={showAll ? contextMap : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function QuestionThread({
  question,
  askerName,
  isStaff,
  currentUserId,
  contextMap,
}: {
  question: QuestionRow;
  askerName?: string;
  isStaff: boolean;
  currentUserId: string | null;
  contextMap?: ContextMap;
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [reply, setReply] = useState("");

  const { data: replies } = useQuery({
    queryKey: ["question-replies", question.id],
    enabled: expanded,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_replies")
        .select("id,user_id,body,created_at")
        .eq("question_id", question.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("ابتدا وارد شوید");
      const { error } = await supabase
        .from("question_replies")
        .insert({ question_id: question.id, user_id: currentUserId, body: reply.trim() });
      if (error) throw error;
      if (isStaff && question.status === "open") {
        await supabase.from("questions").update({ status: "answered" }).eq("id", question.id);
      }
    },
    onSuccess: () => {
      setReply("");
      toast.success("پاسخ ارسال شد");
      qc.invalidateQueries({ queryKey: ["question-replies", question.id] });
      qc.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <button type="button" onClick={() => setExpanded(v => !v)} className="w-full text-start">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{question.title}</div>
            <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{question.body}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <User2 className="h-3 w-3" />
                {isStaff ? (askerName ?? "کاربر") : "شما"}
              </span>
              <span>•</span>
              <span>{fmt(question.created_at)}</span>
              {contextMap && question.lesson_id && contextMap.lessons[question.lesson_id] && (
                <>
                  <span>•</span>
                  <Link
                    to="/lessons/$lessonId"
                    params={{ lessonId: question.lesson_id }}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-primary hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    <GraduationCap className="h-3 w-3" />
                    {contextMap.lessons[question.lesson_id]}
                  </Link>
                </>
              )}
              {contextMap && question.book_id && contextMap.books[question.book_id] && (
                <>
                  <span>•</span>
                  <Link
                    to="/books/$bookId"
                    params={{ bookId: question.book_id }}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-primary hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    <BookOpen className="h-3 w-3" />
                    {contextMap.books[question.book_id]}
                  </Link>
                </>
              )}
              {contextMap && question.course_id && contextMap.courses[question.course_id] && !question.book_id && !question.lesson_id && (
                <>
                  <span>•</span>
                  <Link
                    to="/courses/$courseId"
                    params={{ courseId: question.course_id }}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-primary hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    {contextMap.courses[question.course_id]}
                  </Link>
                </>
              )}
            </div>
          </div>
          <Badge variant={question.status === "answered" ? "default" : "secondary"} className="shrink-0 gap-1">
            {question.status === "answered" ? <CheckCircle2 className="h-3 w-3" /> : null}
            {question.status === "answered" ? "پاسخ داده شده" : "در انتظار پاسخ"}
          </Badge>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <p className="whitespace-pre-wrap text-sm">{question.body}</p>
          {(replies ?? []).map(r => (
            <div
              key={r.id}
              className={`rounded-lg p-3 text-sm ${r.user_id === question.user_id ? "bg-muted" : "bg-primary/10"}`}
            >
              <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                {r.user_id === question.user_id ? <User2 className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
                {r.user_id === question.user_id ? "دانشجو" : "استاد"}
                <span>•</span>
                {fmt(r.created_at)}
              </div>
              <p className="whitespace-pre-wrap">{r.body}</p>
            </div>
          ))}

          <div className="flex items-end gap-2">
            <Textarea
              rows={2}
              placeholder={isStaff ? "پاسخ خود را بنویسید…" : "پیام جدید…"}
              value={reply}
              onChange={e => setReply(e.target.value)}
            />
            <Button disabled={!reply.trim() || send.isPending} onClick={() => send.mutate()} className="gap-2">
              <Send className="h-4 w-4" />
              ارسال
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

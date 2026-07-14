import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText, Video, Music, Download, BookOpen, Languages, Lightbulb } from "lucide-react";
import { ExerciseSection } from "@/components/ExerciseSection";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";

const sanitizeContent = (html: string) => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
const sanitizeEmbed = (html: string) =>
  DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "src", "title", "width", "height", "referrerpolicy", "loading"],
  });

export const Route = createFileRoute("/_authenticated/lessons/$lessonId")({
  component: LessonView,
});

async function getSignedUrl(bucket: string, path: string) {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

function LessonView() {
  const { lessonId } = Route.useParams();
  const { t, dir } = useI18n();

  const { data: lesson } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("*").eq("id", lessonId).single();
      if (error) throw error;
      return data;
    },
  });

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [slideUrl, setSlideUrl] = useState<string | null>(null);

  useEffect(() => {
    if (lesson?.audio_url) getSignedUrl("lesson-audio", lesson.audio_url).then(setAudioUrl);
    if (lesson?.slide_url) getSignedUrl("lesson-slides", lesson.slide_url).then(setSlideUrl);
  }, [lesson]);

  const bookId = lesson?.book_id ?? null;
  const { data: bookInfo } = useQuery({
    queryKey: ["lesson-book-nav", bookId],
    queryFn: async () => {
      const { data: book } = await supabase.from("books").select("id,title,course_id").eq("id", bookId!).single();
      const { data: siblings } = await supabase
        .from("lessons")
        .select("id,title,sort_order")
        .eq("book_id", bookId!)
        .order("sort_order");
      const { data: course } = book?.course_id
        ? await supabase.from("courses").select("id,title").eq("id", book.course_id).single()
        : { data: null };
      return { book, course, siblings: siblings ?? [] };
    },
    enabled: !!bookId,
  });

  const { prev, next } = useMemo(() => {
    const list = bookInfo?.siblings ?? [];
    const idx = list.findIndex(l => l.id === lesson?.id);
    return { prev: idx > 0 ? list[idx - 1] : null, next: idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null };
  }, [bookInfo, lesson]);

  if (!lesson) return <p className="text-muted-foreground">{t("loading")}</p>;

  return (
    <div className="mx-auto max-w-4xl">
      {bookInfo?.book && bookInfo.course && (
        <BreadcrumbNav
          items={[
            { label: bookInfo.course.title, to: "/courses/$courseId", params: { courseId: bookInfo.course.id } },
            { label: bookInfo.book.title, to: "/books/$bookId", params: { bookId: bookInfo.book.id } },
            {
              label: lesson.title,
              currentId: lesson.id,
              siblings: bookInfo.siblings.map(s => ({
                id: s.id,
                label: s.title,
                to: "/lessons/$lessonId",
                params: { lessonId: s.id },
              })),
            },
          ]}
        />
      )}


      <h1 className="mb-8 text-3xl font-extrabold">{lesson.title}</h1>

      {lesson.original_text && (
        <Section icon={BookOpen} title={t("originalText")}>
          <div className="rich-content text-foreground leading-loose" dangerouslySetInnerHTML={{ __html: sanitizeContent(lesson.original_text) }} />
        </Section>
      )}

      {lesson.translation && (
        <Section icon={Languages} title={t("translation")}>
          <div className="rich-content text-foreground leading-loose" dangerouslySetInnerHTML={{ __html: sanitizeContent(lesson.translation) }} />
        </Section>
      )}

      {lesson.explanation && (
        <Section icon={Lightbulb} title={t("explanation")}>
          <div className="rich-content text-foreground leading-loose" dangerouslySetInnerHTML={{ __html: sanitizeContent(lesson.explanation) }} />
        </Section>
      )}


      {lesson.content && (
        <Section icon={FileText} title={t("description")}>
          <div className="rich-content text-foreground" dangerouslySetInnerHTML={{ __html: sanitizeContent(lesson.content) }} />
        </Section>
      )}

      {lesson.video_embed && (
        <Section icon={Video} title={t("video")}>
          <div
            className="aspect-video overflow-hidden rounded-xl [&_iframe]:h-full [&_iframe]:w-full"
            dangerouslySetInnerHTML={{ __html: sanitizeEmbed(lesson.video_embed) }}
          />
        </Section>
      )}

      {audioUrl && (
        <Section icon={Music} title={t("audio")}>
          <audio controls src={audioUrl} className="w-full" />
        </Section>
      )}

      {slideUrl && (
        <Section icon={Download} title={t("slides")}>
          <a href={slideUrl} target="_blank" rel="noreferrer" download>
            <Button className="bg-hero text-primary-foreground hover:opacity-95 gap-2">
              <Download className="h-4 w-4" />
              {t("downloadSlide")}
            </Button>
          </a>
        </Section>
      )}

      <ExerciseSection lessonId={lesson.id} />

      <div className="mt-8 flex items-center justify-between gap-3">
        {prev ? (
          <Link to="/lessons/$lessonId" params={{ lessonId: prev.id }} className="flex-1">
            <Button variant="outline" className="w-full justify-start gap-2">
              <ChevronRight className={`h-4 w-4 ${dir === "ltr" ? "rotate-180" : ""}`} />
              <span className="truncate">درس قبل: {prev.title}</span>
            </Button>
          </Link>
        ) : <div className="flex-1" />}
        {next ? (
          <Link to="/lessons/$lessonId" params={{ lessonId: next.id }} className="flex-1">
            <Button variant="outline" className="w-full justify-end gap-2">
              <span className="truncate">درس بعد: {next.title}</span>
              <ChevronLeft className={`h-4 w-4 ${dir === "ltr" ? "rotate-180" : ""}`} />
            </Button>
          </Link>
        ) : <div className="flex-1" />}
      </div>
    </div>
  );
}


function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card-soft mb-6 rounded-2xl border border-border p-6 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

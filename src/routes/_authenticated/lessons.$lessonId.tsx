import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText, Video, Music, Download, BookOpen, Languages, Lightbulb } from "lucide-react";
import { ExerciseSection } from "@/components/ExerciseSection";

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

  if (!lesson) return <p className="text-muted-foreground">{t("loading")}</p>;

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/courses/$courseId" params={{ courseId: lesson.course_id }}>
        <Button variant="ghost" size="sm" className="mb-4 gap-1">
          <ChevronLeft className={`h-4 w-4 ${dir === "ltr" ? "rotate-180" : ""}`} />
          {t("backToCourse")}
        </Button>
      </Link>

      <h1 className="mb-8 text-3xl font-extrabold">{lesson.title}</h1>

      {lesson.original_text && (
        <Section icon={BookOpen} title={t("originalText")}>
          <div className="whitespace-pre-wrap text-foreground leading-loose">{lesson.original_text}</div>
        </Section>
      )}

      {lesson.translation && (
        <Section icon={Languages} title={t("translation")}>
          <div className="whitespace-pre-wrap text-foreground leading-loose">{lesson.translation}</div>
        </Section>
      )}

      {lesson.explanation && (
        <Section icon={Lightbulb} title={t("explanation")}>
          <div className="whitespace-pre-wrap text-foreground leading-loose">{lesson.explanation}</div>
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

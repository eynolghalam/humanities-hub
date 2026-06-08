import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { gradeAnswer, extractOrGenerateExercises } from "@/lib/exercises.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Sparkles, Trophy, HelpCircle } from "lucide-react";
import { toast } from "sonner";

export function ExerciseSection({ lessonId }: { lessonId: string }) {
  const { t } = useI18n();
  const { isAdmin, isTeacher } = useAuth();
  const qc = useQueryClient();
  const gradeFn = useServerFn(gradeAnswer);
  const extractFn = useServerFn(extractOrGenerateExercises);
  const [generating, setGenerating] = useState(false);

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["exercises", lessonId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lesson_exercises")
        .select("id,question,exercise_type,options,sort_order,source")
        .eq("lesson_id", lessonId)
        .order("sort_order");
      return data ?? [];
    },
  });

  const generate = async () => {
    setGenerating(true);
    try {
      const r = await extractFn({ data: { lessonId } });
      toast.success(`${r.count} ${t("exercisesCreated")}`);
      qc.invalidateQueries({ queryKey: ["exercises", lessonId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) return null;

  return (
    <section className="bg-card-soft mb-6 rounded-2xl border border-border p-6 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <HelpCircle className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold">{t("exercises")}</h2>
        </div>
        {(isAdmin || isTeacher) && (
          <Button variant="outline" size="sm" onClick={generate} disabled={generating} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {generating ? t("analyzing") : exercises && exercises.length > 0 ? t("regenerateExercises") : t("generateExercises")}
          </Button>
        )}
      </div>

      {(!exercises || exercises.length === 0) && (
        <p className="text-sm text-muted-foreground">{t("noExercises")}</p>
      )}

      <div className="space-y-4">
        {exercises?.map((ex, i) => (
          <ExerciseCard key={ex.id} exercise={ex} index={i} onGraded={() => {
            qc.invalidateQueries({ queryKey: ["user-stats"] });
            qc.invalidateQueries({ queryKey: ["book-progress"] });
          }} gradeFn={gradeFn} />
        ))}
      </div>
    </section>
  );
}

interface ExerciseRow {
  id: string;
  question: string;
  exercise_type: string;
  options: unknown;
  source: string;
}

function ExerciseCard({ exercise, index, onGraded, gradeFn }: {
  exercise: ExerciseRow;
  index: number;
  onGraded: () => void;
  gradeFn: (args: { data: { exerciseId: string; userAnswer: string } }) => Promise<{
    is_correct: boolean; score: number; feedback: string; correct_answer: string;
    xp_awarded: number; lesson_completed: boolean;
  }>;
}) {
  const { t } = useI18n();
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | Awaited<ReturnType<typeof gradeFn>>>(null);

  const submit = async () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    try {
      const r = await gradeFn({ data: { exerciseId: exercise.id, userAnswer: answer } });
      setResult(r);
      onGraded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const options = Array.isArray(exercise.options) ? (exercise.options as string[]) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-start gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
        <p className="font-medium leading-relaxed">{exercise.question}</p>
      </div>

      {options && exercise.exercise_type === "mcq" ? (
        <div className="space-y-2 mb-3">
          {options.map((o, i) => (
            <label key={i} className="flex items-center gap-2 rounded-md border border-border bg-background p-2 cursor-pointer hover:border-primary">
              <input type="radio" name={`q-${exercise.id}`} value={o} checked={answer === o} onChange={e => setAnswer(e.target.value)} />
              <span className="text-sm">{o}</span>
            </label>
          ))}
        </div>
      ) : (
        <Textarea
          rows={exercise.exercise_type === "essay" ? 5 : 2}
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder={t("yourAnswer")}
          disabled={!!result}
          className="mb-3"
        />
      )}

      {!result && (
        <Button onClick={submit} disabled={submitting || !answer.trim()} size="sm" className="bg-hero text-primary-foreground gap-2">
          {submitting ? t("analyzing") : t("submitAnswer")}
        </Button>
      )}

      {result && (
        <div className="mt-3 space-y-2">
          <Alert variant={result.is_correct ? "default" : "destructive"} className={result.is_correct ? "border-green-500/40 bg-green-500/10" : ""}>
            <div className="flex items-start gap-2">
              {result.is_correct ? <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" /> : <XCircle className="h-5 w-5 mt-0.5" />}
              <div className="flex-1">
                <AlertDescription className="whitespace-pre-wrap leading-relaxed">{result.feedback}</AlertDescription>
                {!result.is_correct && result.correct_answer && (
                  <div className="mt-2 text-sm">
                    <span className="font-bold">{t("correctAnswer")}: </span>{result.correct_answer}
                  </div>
                )}
              </div>
            </div>
          </Alert>
          <div className="flex items-center gap-3 text-sm">
            {result.xp_awarded > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-bold text-primary">
                <Trophy className="h-4 w-4" /> +{result.xp_awarded} XP
              </span>
            )}
            <span className="text-muted-foreground">{t("score")}: {result.score}</span>
            {result.lesson_completed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-3 py-1 font-bold text-green-700">
                <CheckCircle2 className="h-4 w-4" /> {t("lessonCompleted")}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setResult(null); setAnswer(""); }}>
            {t("tryAgain")}
          </Button>
        </div>
      )}
    </div>
  );
}

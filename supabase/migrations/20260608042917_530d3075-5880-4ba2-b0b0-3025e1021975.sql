
-- Exercises
CREATE TABLE public.lesson_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL,
  question text NOT NULL,
  expected_answer text NOT NULL DEFAULT '',
  exercise_type text NOT NULL DEFAULT 'short',
  options jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'generated',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_exercises TO authenticated;
GRANT ALL ON public.lesson_exercises TO service_role;
ALTER TABLE public.lesson_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view exercises" ON public.lesson_exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage exercises" ON public.lesson_exercises FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "teachers manage own exercises" ON public.lesson_exercises FOR ALL TO authenticated
  USING (has_role(auth.uid(),'teacher'::app_role) AND EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND (l.created_by = auth.uid() OR (l.book_id IS NOT NULL AND teacher_has_book_access(auth.uid(), l.book_id)))))
  WITH CHECK (has_role(auth.uid(),'teacher'::app_role) AND EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND (l.created_by = auth.uid() OR (l.book_id IS NOT NULL AND teacher_has_book_access(auth.uid(), l.book_id)))));

-- User attempts
CREATE TABLE public.user_exercise_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  user_answer text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  score integer NOT NULL DEFAULT 0,
  ai_feedback text,
  correct_answer text,
  xp_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_exercise_attempts TO authenticated;
GRANT ALL ON public.user_exercise_attempts TO service_role;
ALTER TABLE public.user_exercise_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own attempts" ON public.user_exercise_attempts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users insert own attempts" ON public.user_exercise_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins view all attempts" ON public.user_exercise_attempts FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

-- Lesson progress
CREATE TABLE public.user_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'unlocked',
  xp_earned integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_lesson_progress TO authenticated;
GRANT ALL ON public.user_lesson_progress TO service_role;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own progress" ON public.user_lesson_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins view all progress" ON public.user_lesson_progress FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

-- User stats
CREATE TABLE public.user_stats (
  user_id uuid PRIMARY KEY,
  total_xp integer NOT NULL DEFAULT 0,
  weekly_xp integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  hearts integer NOT NULL DEFAULT 5,
  hearts_refill_at timestamptz,
  last_activity_date date,
  league text NOT NULL DEFAULT 'bronze',
  weekly_reset_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view all stats" ON public.user_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "users manage own stats" ON public.user_stats FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Achievements
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_key text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own achievements" ON public.user_achievements FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users insert own achievements" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- updated_at triggers
CREATE TRIGGER trg_lesson_exercises_updated BEFORE UPDATE ON public.lesson_exercises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_user_lesson_progress_updated BEFORE UPDATE ON public.user_lesson_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_user_stats_updated BEFORE UPDATE ON public.user_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_lesson_exercises_lesson ON public.lesson_exercises(lesson_id, sort_order);
CREATE INDEX idx_user_exercise_attempts_user ON public.user_exercise_attempts(user_id, exercise_id, created_at DESC);
CREATE INDEX idx_user_lesson_progress_user ON public.user_lesson_progress(user_id, status);

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own questions" ON public.questions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff read all questions" ON public.questions
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')
  );
CREATE POLICY "Users create own questions" ON public.questions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own questions" ON public.questions
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Staff update questions" ON public.questions
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')
  ) WITH CHECK (
    public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')
  );
CREATE POLICY "Users delete own questions" ON public.questions
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins delete questions" ON public.questions
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')
  );

CREATE INDEX idx_questions_user ON public.questions(user_id);
CREATE INDEX idx_questions_lesson ON public.questions(lesson_id);
CREATE INDEX idx_questions_book ON public.questions(book_id);

CREATE TRIGGER trg_questions_updated BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.question_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_replies TO authenticated;
GRANT ALL ON public.question_replies TO service_role;
ALTER TABLE public.question_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read replies of own question" ON public.question_replies
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.questions q WHERE q.id = question_id AND q.user_id = auth.uid())
  );
CREATE POLICY "Staff read replies" ON public.question_replies
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')
  );
CREATE POLICY "Owner of question can reply" ON public.question_replies
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.questions q WHERE q.id = question_id AND q.user_id = auth.uid())
  );
CREATE POLICY "Staff can reply" ON public.question_replies
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  );
CREATE POLICY "Authors update own replies" ON public.question_replies
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Authors delete own replies" ON public.question_replies
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins delete replies" ON public.question_replies
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')
  );

CREATE INDEX idx_question_replies_q ON public.question_replies(question_id);

CREATE TRIGGER trg_question_replies_updated BEFORE UPDATE ON public.question_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Staff read profiles for QA" ON public.profiles
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')
  );
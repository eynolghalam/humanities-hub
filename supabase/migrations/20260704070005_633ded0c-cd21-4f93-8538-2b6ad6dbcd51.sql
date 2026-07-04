
-- 1) profiles: restrict column-level UPDATE for regular users to safe columns
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, updated_at) ON public.profiles TO authenticated;
-- Admins still need full update; service_role already has ALL
GRANT UPDATE ON public.profiles TO service_role;

-- 2) user_exercise_attempts: add owner-scoped INSERT/UPDATE/DELETE policies
CREATE POLICY "users insert own attempts" ON public.user_exercise_attempts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own attempts" ON public.user_exercise_attempts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users delete own attempts" ON public.user_exercise_attempts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 3) user_lesson_progress: add owner-scoped INSERT/UPDATE/DELETE policies
CREATE POLICY "users insert own progress" ON public.user_lesson_progress
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own progress" ON public.user_lesson_progress
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users delete own progress" ON public.user_lesson_progress
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 4) book_exam_files: restrict teacher delete to their uploads or books they have access to
DROP POLICY IF EXISTS "admin/teacher delete exam files" ON public.book_exam_files;
CREATE POLICY "admin or owning teacher delete exam files"
  ON public.book_exam_files
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      public.has_role(auth.uid(), 'teacher'::app_role)
      AND (uploaded_by = auth.uid() OR public.teacher_has_book_access(auth.uid(), book_id))
    )
  );

-- Also tighten INSERT so teachers can only add files to books they have access to
DROP POLICY IF EXISTS "admin/teacher insert exam files" ON public.book_exam_files;
CREATE POLICY "admin or scoped teacher insert exam files"
  ON public.book_exam_files
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      public.has_role(auth.uid(), 'teacher'::app_role)
      AND public.teacher_has_book_access(auth.uid(), book_id)
    )
  );

-- 5) book_exam_questions: restrict teacher mutations to books they have access to
DROP POLICY IF EXISTS "admin/teacher manage exam questions" ON public.book_exam_questions;
CREATE POLICY "admin or scoped teacher manage exam questions"
  ON public.book_exam_questions
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      public.has_role(auth.uid(), 'teacher'::app_role)
      AND public.teacher_has_book_access(auth.uid(), book_id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      public.has_role(auth.uid(), 'teacher'::app_role)
      AND public.teacher_has_book_access(auth.uid(), book_id)
    )
  );

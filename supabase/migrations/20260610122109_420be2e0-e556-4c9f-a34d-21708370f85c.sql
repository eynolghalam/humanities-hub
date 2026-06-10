
-- 1) Profiles: restrict column-level UPDATE so users cannot self-promote via pending_teacher
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, updated_at) ON public.profiles TO authenticated;

-- 2) user_exercise_attempts: remove client INSERT path; only service role writes
DROP POLICY IF EXISTS "users insert own attempts" ON public.user_exercise_attempts;
REVOKE INSERT, UPDATE, DELETE ON public.user_exercise_attempts FROM authenticated;
GRANT SELECT ON public.user_exercise_attempts TO authenticated;
GRANT ALL ON public.user_exercise_attempts TO service_role;

-- 3) user_lesson_progress: remove client INSERT path; only service role writes completions
DROP POLICY IF EXISTS "users insert own progress" ON public.user_lesson_progress;
REVOKE INSERT, UPDATE, DELETE ON public.user_lesson_progress FROM authenticated;
GRANT SELECT ON public.user_lesson_progress TO authenticated;
GRANT ALL ON public.user_lesson_progress TO service_role;

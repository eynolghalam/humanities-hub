-- Revoke broad SELECT and re-grant only non-sensitive columns to authenticated/anon
REVOKE SELECT ON public.lesson_exercises FROM authenticated;
REVOKE SELECT ON public.lesson_exercises FROM anon;

GRANT SELECT (id, lesson_id, question, exercise_type, options, sort_order, source, created_by, created_at, updated_at)
  ON public.lesson_exercises TO authenticated;

-- service_role retains full ALL privileges; server-side grading uses supabaseAdmin to read expected_answer.
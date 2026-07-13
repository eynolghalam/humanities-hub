
-- Tighten user_stats: remove client-side self-writes; keep owner admin controls
DROP POLICY IF EXISTS "users manage own stats" ON public.user_stats;

CREATE POLICY "owners insert all stats"
ON public.user_stats FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- Tighten user_lesson_progress: no client-side writes (all writes via server functions/service role)
DROP POLICY IF EXISTS "users insert own progress" ON public.user_lesson_progress;
DROP POLICY IF EXISTS "users update own progress" ON public.user_lesson_progress;
DROP POLICY IF EXISTS "users delete own progress" ON public.user_lesson_progress;

-- Tighten user_achievements: no client-side self-awarding
DROP POLICY IF EXISTS "users insert own achievements" ON public.user_achievements;

-- Storage: remove overly-broad teacher write policies for lesson-audio and lesson-slides
DROP POLICY IF EXISTS "Teachers write lesson audio" ON storage.objects;
DROP POLICY IF EXISTS "Teachers update lesson audio" ON storage.objects;
DROP POLICY IF EXISTS "Teachers delete lesson audio" ON storage.objects;
DROP POLICY IF EXISTS "Teachers write lesson slides" ON storage.objects;
DROP POLICY IF EXISTS "Teachers update lesson slides" ON storage.objects;
DROP POLICY IF EXISTS "Teachers delete lesson slides" ON storage.objects;

-- Scoped insert policies (teacher owns the uploaded object)
CREATE POLICY "Teachers write own lesson-audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lesson-audio'
  AND has_role(auth.uid(), 'teacher'::app_role)
  AND owner = auth.uid()
);

CREATE POLICY "Teachers write own lesson-slides"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lesson-slides'
  AND has_role(auth.uid(), 'teacher'::app_role)
  AND owner = auth.uid()
);

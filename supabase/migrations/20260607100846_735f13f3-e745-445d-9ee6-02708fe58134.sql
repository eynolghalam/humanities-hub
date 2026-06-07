
-- 1. Teachers update own lessons: also enforce book access on new book_id
DROP POLICY IF EXISTS "Teachers update own lessons" ON public.lessons;
CREATE POLICY "Teachers update own lessons" ON public.lessons
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND created_by = auth.uid()
  AND (book_id IS NULL OR teacher_has_book_access(auth.uid(), book_id))
)
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
  AND created_by = auth.uid()
  AND book_id IS NOT NULL
  AND teacher_has_book_access(auth.uid(), book_id)
);

-- 2. Prevent self-escalation of pending_teacher: column-level grants
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, updated_at) ON public.profiles TO authenticated;
-- admins still need full update; service_role already has ALL

-- 3. Allow teachers to upload/manage lesson audio + slides
CREATE POLICY "Teachers write lesson audio" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lesson-audio' AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers update lesson audio" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'lesson-audio' AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers delete lesson audio" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'lesson-audio' AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers write lesson slides" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lesson-slides' AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers update lesson slides" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'lesson-slides' AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers delete lesson slides" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'lesson-slides' AND has_role(auth.uid(), 'teacher'::app_role));

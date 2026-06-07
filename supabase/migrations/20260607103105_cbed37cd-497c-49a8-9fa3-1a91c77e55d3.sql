
-- Tighten storage policies: teachers can only modify/delete their own files
DROP POLICY IF EXISTS "Teachers update lesson-audio" ON storage.objects;
DROP POLICY IF EXISTS "Teachers delete lesson-audio" ON storage.objects;
DROP POLICY IF EXISTS "Teachers update lesson-slides" ON storage.objects;
DROP POLICY IF EXISTS "Teachers delete lesson-slides" ON storage.objects;

CREATE POLICY "Teachers update own lesson-audio"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lesson-audio' AND has_role(auth.uid(), 'teacher'::app_role) AND owner = auth.uid())
  WITH CHECK (bucket_id = 'lesson-audio' AND has_role(auth.uid(), 'teacher'::app_role) AND owner = auth.uid());

CREATE POLICY "Teachers delete own lesson-audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lesson-audio' AND has_role(auth.uid(), 'teacher'::app_role) AND owner = auth.uid());

CREATE POLICY "Teachers update own lesson-slides"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lesson-slides' AND has_role(auth.uid(), 'teacher'::app_role) AND owner = auth.uid())
  WITH CHECK (bucket_id = 'lesson-slides' AND has_role(auth.uid(), 'teacher'::app_role) AND owner = auth.uid());

CREATE POLICY "Teachers delete own lesson-slides"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lesson-slides' AND has_role(auth.uid(), 'teacher'::app_role) AND owner = auth.uid());

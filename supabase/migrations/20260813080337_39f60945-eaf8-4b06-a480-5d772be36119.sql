
-- 1) book_exam_files: scope reads
DROP POLICY IF EXISTS "auth read exam files" ON public.book_exam_files;
CREATE POLICY "staff read exam files"
ON public.book_exam_files FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR uploaded_by = auth.uid()
  OR (public.has_role(auth.uid(), 'teacher') AND public.teacher_has_book_access(auth.uid(), book_id))
);

-- 2) storage: exam-files bucket reads scoped to the same audience
DROP POLICY IF EXISTS "auth read exam-files" ON storage.objects;
CREATE POLICY "staff read exam-files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'exam-files'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.book_exam_files f
      WHERE f.file_path = storage.objects.name
        AND (
          f.uploaded_by = auth.uid()
          OR (public.has_role(auth.uid(), 'teacher') AND public.teacher_has_book_access(auth.uid(), f.book_id))
        )
    )
  )
);

-- 3) lesson media: only files actually referenced by a lesson (or staff)
DROP POLICY IF EXISTS "Authenticated read lesson audio" ON storage.objects;
CREATE POLICY "Scoped read lesson audio"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lesson-audio'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'teacher')
    OR EXISTS (SELECT 1 FROM public.lessons l WHERE l.audio_url LIKE '%' || storage.objects.name)
  )
);

DROP POLICY IF EXISTS "Authenticated read lesson slides" ON storage.objects;
CREATE POLICY "Scoped read lesson slides"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lesson-slides'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'teacher')
    OR EXISTS (SELECT 1 FROM public.lessons l WHERE l.slide_url LIKE '%' || storage.objects.name)
  )
);

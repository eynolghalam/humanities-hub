
CREATE TABLE public.book_exam_files (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  file_path text not null,
  file_type text not null,
  title text,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_exam_files TO authenticated;
GRANT ALL ON public.book_exam_files TO service_role;
ALTER TABLE public.book_exam_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read exam files" ON public.book_exam_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin/teacher insert exam files" ON public.book_exam_files FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "admin/teacher delete exam files" ON public.book_exam_files FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));

CREATE TABLE public.book_exam_questions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  question text not null,
  sort_order int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_exam_questions TO authenticated;
GRANT ALL ON public.book_exam_questions TO service_role;
ALTER TABLE public.book_exam_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read exam questions" ON public.book_exam_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin/teacher manage exam questions" ON public.book_exam_questions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));

-- Storage policies for exam-files bucket
CREATE POLICY "auth read exam-files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'exam-files');
CREATE POLICY "admin/teacher upload exam-files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'exam-files' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher')));
CREATE POLICY "owner delete exam-files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'exam-files' AND owner = auth.uid());

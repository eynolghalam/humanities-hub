
CREATE POLICY "Authenticated read lesson audio" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lesson-audio');
CREATE POLICY "Admins write lesson audio" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lesson-audio' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update lesson audio" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lesson-audio' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete lesson audio" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lesson-audio' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read lesson slides" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lesson-slides');
CREATE POLICY "Admins write lesson slides" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lesson-slides' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update lesson slides" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lesson-slides' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete lesson slides" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lesson-slides' AND public.has_role(auth.uid(), 'admin'));

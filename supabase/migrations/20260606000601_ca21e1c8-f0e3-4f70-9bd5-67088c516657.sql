
CREATE POLICY "Public can read homepage-images" ON storage.objects FOR SELECT
  USING (bucket_id = 'homepage-images');
CREATE POLICY "Admins upload homepage-images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'homepage-images' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update homepage-images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'homepage-images' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete homepage-images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'homepage-images' AND has_role(auth.uid(), 'admin'::app_role));

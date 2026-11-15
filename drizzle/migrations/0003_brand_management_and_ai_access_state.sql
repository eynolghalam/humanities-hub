CREATE POLICY "Owners manage brand setting" ON public.site_settings FOR ALL TO authenticated USING (key = 'brand_assets' AND public.has_role(auth.uid(), 'owner')) WITH CHECK (key = 'brand_assets' AND public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners manage brand images" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'homepage-images' AND (storage.foldername(name))[1] = 'brand' AND public.has_role(auth.uid(), 'owner')) WITH CHECK (bucket_id = 'homepage-images' AND (storage.foldername(name))[1] = 'brand' AND public.has_role(auth.uid(), 'owner'));
CREATE TABLE public.ai_answer_blocks (user_id uuid PRIMARY KEY, reason text NOT NULL, status integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.ai_answer_blocks TO authenticated;
GRANT ALL ON public.ai_answer_blocks TO service_role;
ALTER TABLE public.ai_answer_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own AI block" ON public.ai_answer_blocks FOR SELECT TO authenticated USING (user_id = auth.uid());
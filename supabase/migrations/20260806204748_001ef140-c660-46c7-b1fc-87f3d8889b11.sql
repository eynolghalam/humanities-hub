CREATE TABLE public.ai_settings (
  id boolean PRIMARY KEY DEFAULT true,
  openrouter_api_key text,
  openrouter_models text[] NOT NULL DEFAULT ARRAY['google/gemini-2.0-flash-exp:free','meta-llama/llama-3.3-70b-instruct:free','deepseek/deepseek-chat-v3.1:free'],
  custom_base_url text,
  custom_api_key text,
  custom_models text[] NOT NULL DEFAULT '{}',
  google_translate_fallback boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_settings_singleton CHECK (id)
);

GRANT SELECT, INSERT, UPDATE ON public.ai_settings TO authenticated;
GRANT ALL ON public.ai_settings TO service_role;

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and owners can view ai settings" ON public.ai_settings
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE POLICY "Admins and owners can insert ai settings" ON public.ai_settings
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE POLICY "Admins and owners can update ai settings" ON public.ai_settings
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

INSERT INTO public.ai_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
-- 1. phone on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_key ON public.profiles(phone) WHERE phone IS NOT NULL;

-- 2. lessons: exam-exempt flag
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS no_exam_required boolean NOT NULL DEFAULT false;

-- 3. parallel/equivalent books
CREATE TABLE public.book_equivalents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  equivalent_book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, equivalent_book_id),
  CHECK (book_id <> equivalent_book_id)
);
GRANT SELECT ON public.book_equivalents TO authenticated;
GRANT ALL ON public.book_equivalents TO service_role;
ALTER TABLE public.book_equivalents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read equivalents" ON public.book_equivalents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage equivalents" ON public.book_equivalents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner') OR public.teacher_has_book_access(auth.uid(), book_id))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner') OR public.teacher_has_book_access(auth.uid(), book_id));

-- 4. sms settings (single row, admin only)
CREATE TABLE public.sms_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  auth_mode text NOT NULL DEFAULT 'otp' CHECK (auth_mode IN ('otp','password','both')),
  send_url text,
  http_method text NOT NULL DEFAULT 'POST',
  headers_json text,
  body_template text,
  api_key text,
  sender text,
  message_template text NOT NULL DEFAULT 'کد ورود شما به حوزتنا: {code}',
  code_ttl_seconds integer NOT NULL DEFAULT 300,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sms_settings TO authenticated;
GRANT ALL ON public.sms_settings TO service_role;
ALTER TABLE public.sms_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sms settings" ON public.sms_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));
CREATE POLICY "Admins insert sms settings" ON public.sms_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));
CREATE POLICY "Admins update sms settings" ON public.sms_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));
CREATE TRIGGER trg_sms_settings_updated BEFORE UPDATE ON public.sms_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.sms_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- 5. OTP codes (server-only access)
CREATE TABLE public.phone_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  purpose text NOT NULL DEFAULT 'login',
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phone_otp_codes_phone_idx ON public.phone_otp_codes(phone, created_at DESC);
GRANT ALL ON public.phone_otp_codes TO service_role;
ALTER TABLE public.phone_otp_codes ENABLE ROW LEVEL SECURITY;
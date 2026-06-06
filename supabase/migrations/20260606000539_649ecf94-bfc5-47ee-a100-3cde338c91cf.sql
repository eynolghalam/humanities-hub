
-- Site settings (single-row key/value for hero text, app name, etc., trilingual)
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value_fa text,
  value_en text,
  value_ar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read site_settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage site_settings" ON public.site_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_site_settings_updated BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Editable homepage blocks (feature cards, custom sections, etc.)
CREATE TABLE public.homepage_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'feature', -- 'feature' | 'custom'
  icon text,
  image_url text,
  title_fa text,
  title_en text,
  title_ar text,
  body_fa text,
  body_en text,
  body_ar text,
  sort_order int NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homepage_blocks TO anon, authenticated;
GRANT ALL ON public.homepage_blocks TO service_role;
ALTER TABLE public.homepage_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read homepage_blocks" ON public.homepage_blocks FOR SELECT USING (true);
CREATE POLICY "Admins manage homepage_blocks" ON public.homepage_blocks FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_homepage_blocks_updated BEFORE UPDATE ON public.homepage_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial site settings
INSERT INTO public.site_settings (key, value_fa, value_en, value_ar) VALUES
  ('app_name', 'حوزتنا', 'Hawzatuna', 'حوزتنا'),
  ('tagline', 'پلتفرم آموزشی علوم حوزوی', 'Hawza Sciences Platform', 'منصة علوم الحوزة'),
  ('hero_title', 'آموزشی نوین برای اندیشه‌ای ژرف', 'Modern Learning for Deeper Thinking', 'تعليم حديث لفكر عميق'),
  ('hero_sub', 'دوره‌های منسجم، درس‌های چندرسانه‌ای، و یادگیری بدون مرز در علوم حوزوی.', 'Coherent courses, multimedia lessons, and limitless learning.', 'دورات متكاملة ودروس متعددة الوسائط وتعلم بلا حدود.'),
  ('cta_primary', 'شروع یادگیری', 'Start Learning', 'ابدأ التعلم'),
  ('cta_secondary', 'ثبت‌نام', 'Sign Up', 'إنشاء حساب'),
  ('hero_image_url', NULL, NULL, NULL);

-- Seed default feature blocks
INSERT INTO public.homepage_blocks (kind, icon, sort_order, title_fa, title_en, title_ar, body_fa, body_en, body_ar) VALUES
  ('feature', 'BookOpen', 1, 'محتوای ساخت‌یافته', 'Structured Content', 'محتوى منظم', 'دوره‌ها بر اساس پایه و سطح طبقه‌بندی شده‌اند.', 'Courses organized by grade and level.', 'دورات مصنفة حسب المرحلة والمستوى.'),
  ('feature', 'Sparkles', 2, 'چندرسانه‌ای', 'Multimedia', 'وسائط متعددة', 'متن، ویدیو، صوت و اسلاید در یک صفحه.', 'Text, video, audio and slides in one place.', 'نص وفيديو وصوت وشرائح في صفحة واحدة.'),
  ('feature', 'Smartphone', 3, 'دسترسی آسان', 'Easy Access', 'وصول سهل', 'سازگار با موبایل، تجربه‌ای روان در هر دستگاه.', 'Mobile-friendly, smooth on every device.', 'متوافق مع الجوال، تجربة سلسة على كل جهاز.');

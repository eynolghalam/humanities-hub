
-- Fix profiles: restrict SELECT to own profile + admin
DROP POLICY IF EXISTS "Profiles are viewable by authenticated" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Fix user_stats: restrict SELECT to own stats + admin
DROP POLICY IF EXISTS "users view all stats" ON public.user_stats;
CREATE POLICY "users view own stats" ON public.user_stats FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins view all stats" ON public.user_stats FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix user_lesson_progress: remove DELETE/UPDATE from client; keep SELECT + INSERT only
DROP POLICY IF EXISTS "users manage own progress" ON public.user_lesson_progress;
CREATE POLICY "users view own progress" ON public.user_lesson_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users insert own progress" ON public.user_lesson_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
-- Note: server functions use service_role (or RLS-bypassing path) — but our server fns currently use the user's supabase client.
-- We need a SECURITY DEFINER path or service role. Update server fn to use admin client for progress upsert.

-- Remove hardcoded admin email from handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _requested text;
BEGIN
  _requested := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'student');
  INSERT INTO public.profiles (id, full_name, pending_teacher)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    (_requested = 'teacher')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$function$;

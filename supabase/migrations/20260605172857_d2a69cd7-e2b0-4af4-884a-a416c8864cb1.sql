
-- profile flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_teacher boolean NOT NULL DEFAULT false;

-- lesson ownership
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS created_by uuid;

-- teacher access tables
CREATE TABLE IF NOT EXISTS public.teacher_course_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_course_access TO authenticated;
GRANT ALL ON public.teacher_course_access TO service_role;
ALTER TABLE public.teacher_course_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage teacher_course_access" ON public.teacher_course_access
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers view own course access" ON public.teacher_course_access
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.teacher_book_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, book_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_book_access TO authenticated;
GRANT ALL ON public.teacher_book_access TO service_role;
ALTER TABLE public.teacher_book_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage teacher_book_access" ON public.teacher_book_access
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers view own book access" ON public.teacher_book_access
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

-- helpers
CREATE OR REPLACE FUNCTION public.teacher_has_course_access(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.teacher_course_access WHERE teacher_id = _user_id AND course_id = _course_id)
$$;

CREATE OR REPLACE FUNCTION public.teacher_has_book_access(_user_id uuid, _book_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_book_access WHERE teacher_id = _user_id AND book_id = _book_id
    UNION
    SELECT 1 FROM public.books b
      JOIN public.teacher_course_access tca ON tca.course_id = b.course_id
      WHERE b.id = _book_id AND tca.teacher_id = _user_id
  )
$$;

-- admin can see/manage all profiles and roles
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all user_roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage user_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- signup trigger: respect requested_role metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  IF NEW.email = 'm.rosano.e@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  END IF;
  RETURN NEW;
END; $$;

-- teacher scoped policies for books
CREATE POLICY "Teachers insert books in their courses" ON public.books FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND public.teacher_has_course_access(auth.uid(), course_id));
CREATE POLICY "Teachers update books in their courses" ON public.books FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND public.teacher_has_course_access(auth.uid(), course_id))
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND public.teacher_has_course_access(auth.uid(), course_id));
CREATE POLICY "Teachers delete books in their courses" ON public.books FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND public.teacher_has_course_access(auth.uid(), course_id));

-- teacher scoped policies for lessons
CREATE POLICY "Teachers insert lessons in allowed books" ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher')
    AND created_by = auth.uid()
    AND book_id IS NOT NULL
    AND public.teacher_has_book_access(auth.uid(), book_id)
  );
CREATE POLICY "Teachers update own lessons" ON public.lessons FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND created_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND created_by = auth.uid());
CREATE POLICY "Teachers delete own lessons" ON public.lessons FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND created_by = auth.uid());

-- teacher scoped policies for categories
CREATE POLICY "Teachers manage categories in their courses" ON public.book_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND public.teacher_has_course_access(auth.uid(), course_id))
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND public.teacher_has_course_access(auth.uid(), course_id));

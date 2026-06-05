CREATE TABLE public.book_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_categories TO authenticated;
GRANT ALL ON public.book_categories TO service_role;
ALTER TABLE public.book_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view book_categories" ON public.book_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage book_categories" ON public.book_categories FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER update_book_categories_updated_at BEFORE UPDATE ON public.book_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_book_categories_course ON public.book_categories(course_id);

ALTER TABLE public.books ADD COLUMN category_id uuid REFERENCES public.book_categories(id) ON DELETE SET NULL;
CREATE INDEX idx_books_category ON public.books(category_id);

ALTER TABLE public.lessons
  ADD COLUMN original_text text,
  ADD COLUMN translation text,
  ADD COLUMN explanation text;
GRANT SELECT ON public.courses, public.books, public.book_categories TO anon;
GRANT SELECT (id,course_id,book_id,title,content,original_text,translation,explanation,sort_order,no_exam_required) ON public.lessons TO anon;
CREATE POLICY "Guests read courses" ON public.courses FOR SELECT TO anon USING (true);
CREATE POLICY "Guests read books" ON public.books FOR SELECT TO anon USING (true);
CREATE POLICY "Guests read book groups" ON public.book_categories FOR SELECT TO anon USING (true);
CREATE POLICY "Guests read lesson text" ON public.lessons FOR SELECT TO anon USING (true);
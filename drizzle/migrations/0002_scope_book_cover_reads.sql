DROP POLICY IF EXISTS "Book covers readable by signed in users" ON storage.objects;
CREATE POLICY "Book covers readable when attached to a book"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'book-covers' AND (
    EXISTS (SELECT 1 FROM public.books b WHERE b.cover_path = storage.objects.name)
    OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
    OR owner_id = (select auth.uid()::text)
  )
);
CREATE FUNCTION public.is_attached_book_cover(p_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.books WHERE cover_path=p_path) $$;
REVOKE ALL ON FUNCTION public.is_attached_book_cover(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_attached_book_cover(text) TO anon, authenticated;
ALTER POLICY "Everyone reads attached book covers" ON storage.objects USING(bucket_id='book-covers' AND public.is_attached_book_cover(name));
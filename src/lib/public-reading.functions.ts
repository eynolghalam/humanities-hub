import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';

export const readPublicContent = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ kind: z.enum(['courses', 'course', 'book', 'lesson']), id: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const url = process.env['SUPABASE_URL'] || import.meta.env.VITE_SUPABASE_URL;
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'] || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error('اتصال به محتوای آموزشی در دسترس نیست');
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data: courses, error } = await client.from('courses').select('id,title,description,sort_order,library_url,books(count)').order('sort_order');
    if (error) throw error;
    if (data.kind === 'courses') return { courses: courses ?? [], course: null, book: null, lesson: null, categories: [], books: [], lessons: [] };
    if (!data.id) throw new Error('المحتوى المطلوب غير موجود');
    const lessonRes = data.kind === 'lesson' ? await client.from('lessons').select('id,course_id,book_id,title,content,original_text,translation,explanation,sort_order,no_exam_required').eq('id', data.id).single() : { data: null, error: null };
    if (lessonRes.error) throw lessonRes.error;
    const bookId = data.kind === 'book' ? data.id : lessonRes.data?.book_id;
    const bookRes = bookId ? await client.from('books').select('id,title,description,course_id,cover_path').eq('id', bookId).single() : { data: null, error: null };
    if (bookRes.error) throw bookRes.error;
    const courseId = data.kind === 'course' ? data.id : bookRes.data?.course_id ?? lessonRes.data?.course_id;
    const [books, categories, lessons] = await Promise.all([
      courseId ? client.from('books').select('id,title,description,sort_order,category_id,cover_path').eq('course_id', courseId).order('sort_order') : Promise.resolve({ data: [], error: null }),
      courseId ? client.from('book_categories').select('id,title,sort_order').eq('course_id', courseId).order('sort_order') : Promise.resolve({ data: [], error: null }),
      bookId ? client.from('lessons').select('id,title,sort_order,translation').eq('book_id', bookId).order('sort_order') : Promise.resolve({ data: [], error: null }),
    ]);
    for (const result of [books, categories, lessons]) if (result.error) throw result.error;
    return { courses: courses ?? [], course: courses?.find(c => c.id === courseId) ?? null, book: bookRes.data, lesson: lessonRes.data, books: books.data ?? [], categories: categories.data ?? [], lessons: lessons.data ?? [] };
  });
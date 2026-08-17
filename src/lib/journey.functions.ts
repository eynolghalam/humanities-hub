import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCourseJourney = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ courseId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: course } = await supabase
      .from("courses").select("id,title,description").eq("id", data.courseId).single();
    const { data: books } = await supabase
      .from("books").select("id,title,sort_order")
      .eq("course_id", data.courseId).order("sort_order");
    const { data: lessons } = await supabase
      .from("lessons").select("id,title,sort_order,book_id,no_exam_required")
      .eq("course_id", data.courseId).order("sort_order");
    const ids = (lessons ?? []).map(l => l.id);
    const { data: progress } = ids.length
      ? await supabase.from("user_lesson_progress")
          .select("lesson_id,status").eq("user_id", userId).in("lesson_id", ids)
      : { data: [] as { lesson_id: string; status: string }[] };
    const progMap = new Map((progress ?? []).map(p => [p.lesson_id, p.status]));

    // parallel/equivalent books: finishing one satisfies the others
    const bookIds = (books ?? []).map(b => b.id);
    const { data: equivalents } = bookIds.length
      ? await supabase.from("book_equivalents").select("book_id,equivalent_book_id").in("book_id", bookIds)
      : { data: [] as { book_id: string; equivalent_book_id: string }[] };
    const equivMap = new Map<string, string[]>();
    for (const e of equivalents ?? []) {
      equivMap.set(e.book_id, [...(equivMap.get(e.book_id) ?? []), e.equivalent_book_id]);
      equivMap.set(e.equivalent_book_id, [...(equivMap.get(e.equivalent_book_id) ?? []), e.book_id]);
    }
    const isBookDone = (bookId: string) => {
      const bls = (lessons ?? []).filter(l => l.book_id === bookId);
      return bls.length > 0 && bls.every(l => l.no_exam_required || progMap.get(l.id) === "completed");
    };
    const doneCache = new Map<string, boolean>();
    const bookDone = (bookId: string) => {
      if (!doneCache.has(bookId)) doneCache.set(bookId, isBookDone(bookId));
      return doneCache.get(bookId)!;
    };

    const bookGroups = (books ?? []).map(b => {
      const satisfiedByEquivalent = (equivMap.get(b.id) ?? []).some(id => bookDone(id));
      const bls = (lessons ?? [])
        .filter(l => l.book_id === b.id)
        .sort((a, c) => a.sort_order - c.sort_order);
      let prevDone = true;
      const items = bls.map(l => {
        const status = progMap.get(l.id) === "completed"
          ? "completed"
          : satisfiedByEquivalent || prevDone ? "unlocked" : "locked";
        // exam-exempt lessons never block the next lesson
        prevDone = status === "completed" || l.no_exam_required;
        return { id: l.id, title: l.title, status };
      });
      return { id: b.id, title: b.title, lessons: items, satisfiedByEquivalent };
    });
    return { course, books: bookGroups };
  });


export const listCoursesWithProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: courses } = await supabase
      .from("courses").select("id,title,description,sort_order").order("sort_order");
    const out: Array<{ id: string; title: string; description: string | null; total: number; completed: number; percent: number }> = [];
    for (const c of courses ?? []) {
      const { data: lessons } = await supabase.from("lessons").select("id").eq("course_id", c.id);
      const ids = (lessons ?? []).map(l => l.id);
      let done = 0;
      if (ids.length) {
        const { data: prog } = await supabase
          .from("user_lesson_progress").select("lesson_id,status")
          .eq("user_id", userId).in("lesson_id", ids);
        done = (prog ?? []).filter(p => p.status === "completed").length;
      }
      out.push({
        id: c.id, title: c.title, description: c.description,
        total: ids.length, completed: done,
        percent: ids.length ? Math.round((done / ids.length) * 100) : 0,
      });
    }
    return out;
  });

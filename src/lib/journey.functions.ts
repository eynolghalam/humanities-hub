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
      .from("lessons").select("id,title,sort_order,book_id")
      .eq("course_id", data.courseId).order("sort_order");
    const ids = (lessons ?? []).map(l => l.id);
    const { data: progress } = ids.length
      ? await supabase.from("user_lesson_progress")
          .select("lesson_id,status").eq("user_id", userId).in("lesson_id", ids)
      : { data: [] as { lesson_id: string; status: string }[] };
    const progMap = new Map((progress ?? []).map(p => [p.lesson_id, p.status]));

    const bookGroups = (books ?? []).map(b => {
      const bls = (lessons ?? [])
        .filter(l => l.book_id === b.id)
        .sort((a, c) => a.sort_order - c.sort_order);
      let prevDone = true;
      const items = bls.map(l => {
        const status = progMap.get(l.id) === "completed"
          ? "completed"
          : prevDone ? "unlocked" : "locked";
        prevDone = status === "completed";
        return { id: l.id, title: l.title, status };
      });
      return { id: b.id, title: b.title, lessons: items };
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

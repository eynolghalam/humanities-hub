import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(body: unknown) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error("محدودیت درخواست. لطفاً کمی بعد دوباره تلاش کنید.");
    if (res.status === 402) throw new Error("اعتبار هوش مصنوعی تمام شده. لطفاً اعتبار اضافه کنید.");
    throw new Error(`AI error: ${res.status} ${txt}`);
  }
  return res.json();
}

/* --------------------- Extract or generate exercises --------------------- */
export const extractOrGenerateExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ lessonId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: lesson, error: lerr } = await supabase
      .from("lessons")
      .select("id,title,original_text,translation,explanation,content")
      .eq("id", data.lessonId)
      .single();
    if (lerr || !lesson) throw new Error("درس یافت نشد");

    const fullText = [lesson.title, lesson.original_text, lesson.translation, lesson.explanation, lesson.content]
      .filter(Boolean).join("\n\n");
    if (fullText.trim().length < 20) throw new Error("متن درس برای استخراج تمرین کافی نیست");

    const system = `تو یک معلم متخصص علوم حوزوی هستی. از متن درس داده شده، سوالات تمرین استخراج یا تولید کن.
- اگر در متن سوال/تمرین/مساله صریح وجود دارد (مثل «تمرین»، «مساله»، «سوال»، «اشکال»)، آن‌ها را استخراج کن و source را "extracted" بگذار.
- اگر سوال صریحی نیست، 3 تا 5 سوال کوتاه و عمیق از مفاهیم درس تولید کن و source را "generated" بگذار.
- برای هر سوال: question (متن سوال به فارسی/عربی)، expected_answer (پاسخ صحیح کامل)، exercise_type ("short" یا "essay" یا "mcq")، options (اگر mcq است، آرایه گزینه‌ها).
- خروجی فقط JSON معتبر بر اساس schema.`;

    const json = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: fullText.slice(0, 30000) },
      ],
      tools: [{
        type: "function",
        function: {
          name: "save_exercises",
          description: "ذخیره سوالات تمرین",
          parameters: {
            type: "object",
            properties: {
              exercises: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    expected_answer: { type: "string" },
                    exercise_type: { type: "string", enum: ["short", "essay", "mcq"] },
                    options: { type: "array", items: { type: "string" } },
                    source: { type: "string", enum: ["extracted", "generated"] },
                  },
                  required: ["question", "expected_answer", "exercise_type", "source"],
                  additionalProperties: false,
                },
              },
            },
            required: ["exercises"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "save_exercises" } },
    });

    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("خروجی AI نامعتبر");
    const parsed = JSON.parse(args) as {
      exercises: Array<{ question: string; expected_answer: string; exercise_type: string; options?: string[]; source: string }>;
    };

    // delete old + insert new
    await supabase.from("lesson_exercises").delete().eq("lesson_id", data.lessonId);
    const rows = parsed.exercises.map((e, i) => ({
      lesson_id: data.lessonId,
      question: e.question,
      expected_answer: e.expected_answer,
      exercise_type: e.exercise_type,
      options: (e.options ?? null) as unknown as never,
      source: e.source,
      sort_order: i,
      created_by: context.userId,
    }));
    if (rows.length) {
      const { error } = await supabase.from("lesson_exercises").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { count: rows.length };
  });

/* --------------------- Grade answer + gamification --------------------- */
const todayStr = () => new Date().toISOString().slice(0, 10);

export const gradeAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    exerciseId: z.string().uuid(),
    userAnswer: z.string().min(1).max(5000),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: ex, error: eerr } = await supabase
      .from("lesson_exercises")
      .select("id,lesson_id,question,expected_answer,exercise_type,options")
      .eq("id", data.exerciseId)
      .single();
    if (eerr || !ex) throw new Error("سوال یافت نشد");

    // Ensure stats row exists; check hearts
    const { data: existingStats } = await supabase
      .from("user_stats").select("*").eq("user_id", userId).maybeSingle();
    let stats = existingStats;
    if (!stats) {
      const { data: created } = await supabase.from("user_stats").insert({ user_id: userId }).select("*").single();
      stats = created;
    }
    if (!stats) throw new Error("خطا در ساخت آمار");
    if (stats.hearts <= 0) {
      throw new Error("قلب‌های شما تمام شده! ۱ ساعت صبر کنید یا با تکمیل تمرین‌های دیگر شارژ شوید.");
    }

    // Ask AI to grade
    const system = `تو یک استاد علوم حوزوی هستی که پاسخ طلبه را تصحیح می‌کنی. به زبان فارسی و محترمانه پاسخ بده.
- پاسخ کاربر را با پاسخ صحیح مقایسه کن.
- اگر مفهوماً درست است (نه لزوماً کلمه به کلمه)، is_correct=true بگذار.
- score بین ۰ تا ۱۰۰ بر اساس میزان درستی و کامل بودن.
- feedback را خلاصه و آموزشی بنویس: اگر درست بود تأیید و تشویق کوتاه؛ اگر اشتباه بود دقیقاً بگو کجا اشتباه است و پاسخ درست چه بوده.`;

    const aiJson = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: `سوال: ${ex.question}\nپاسخ صحیح مرجع: ${ex.expected_answer}\nپاسخ طلبه: ${data.userAnswer}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "grade",
          parameters: {
            type: "object",
            properties: {
              is_correct: { type: "boolean" },
              score: { type: "number" },
              feedback: { type: "string" },
              correct_answer: { type: "string" },
            },
            required: ["is_correct", "score", "feedback", "correct_answer"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "grade" } },
    });

    const args = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("خروجی AI نامعتبر");
    const grade = JSON.parse(args) as { is_correct: boolean; score: number; feedback: string; correct_answer: string };

    // XP
    const xp = grade.is_correct ? (grade.score >= 90 ? 15 : 10) : 0;

    // Record attempt
    await supabase.from("user_exercise_attempts").insert({
      user_id: userId,
      exercise_id: ex.id,
      user_answer: data.userAnswer,
      is_correct: grade.is_correct,
      score: Math.round(grade.score),
      ai_feedback: grade.feedback,
      correct_answer: grade.correct_answer,
      xp_awarded: xp,
    });

    // Update stats: streak, hearts, xp, league
    const today = todayStr();
    const last = stats.last_activity_date as string | null;
    let newStreak = stats.current_streak;
    if (grade.is_correct) {
      if (last === today) {
        /* same day, keep */
      } else {
        const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        newStreak = last === yest ? stats.current_streak + 1 : 1;
      }
    }
    const newHearts = grade.is_correct ? stats.hearts : Math.max(0, stats.hearts - 1);
    const newTotalXP = stats.total_xp + xp;
    const newWeeklyXP = stats.weekly_xp + xp;
    const league = newTotalXP >= 5000 ? "diamond" : newTotalXP >= 2000 ? "gold" : newTotalXP >= 500 ? "silver" : "bronze";

    await supabase.from("user_stats").update({
      total_xp: newTotalXP,
      weekly_xp: newWeeklyXP,
      current_streak: newStreak,
      longest_streak: Math.max(stats.longest_streak, newStreak),
      hearts: newHearts,
      hearts_refill_at: newHearts === 0 ? new Date(Date.now() + 3600_000).toISOString() : stats.hearts_refill_at,
      last_activity_date: grade.is_correct ? today : stats.last_activity_date,
      league,
    }).eq("user_id", userId);

    // Lesson progress: if all exercises of this lesson are correct → completed
    const { data: allEx } = await supabase
      .from("lesson_exercises").select("id").eq("lesson_id", ex.lesson_id);
    const exIds = (allEx ?? []).map(e => e.id);
    let lessonCompleted = false;
    if (exIds.length > 0) {
      const { data: attempts } = await supabase
        .from("user_exercise_attempts")
        .select("exercise_id,is_correct,created_at")
        .eq("user_id", userId)
        .in("exercise_id", exIds);
      const bestByEx = new Map<string, boolean>();
      (attempts ?? []).forEach(a => {
        if (a.is_correct) bestByEx.set(a.exercise_id, true);
        else if (!bestByEx.has(a.exercise_id)) bestByEx.set(a.exercise_id, false);
      });
      lessonCompleted = exIds.every(id => bestByEx.get(id) === true);
    }

    if (lessonCompleted) {
      const { data: prog } = await supabase
        .from("user_lesson_progress").select("*").eq("user_id", userId).eq("lesson_id", ex.lesson_id).maybeSingle();
      if (!prog || prog.status !== "completed") {
        const bonusXP = 20;
        await supabase.from("user_lesson_progress").upsert({
          user_id: userId,
          lesson_id: ex.lesson_id,
          status: "completed",
          xp_earned: (prog?.xp_earned ?? 0) + bonusXP,
          completed_at: new Date().toISOString(),
        }, { onConflict: "user_id,lesson_id" });
        await supabase.from("user_stats").update({ total_xp: newTotalXP + bonusXP, weekly_xp: newWeeklyXP + bonusXP }).eq("user_id", userId);
      }
    }

    // Achievements
    const badges: string[] = [];
    if (lessonCompleted) badges.push("first_lesson");
    if (newStreak >= 7) badges.push("streak_7");
    if (newStreak >= 30) badges.push("streak_30");
    if (newTotalXP >= 100) badges.push("xp_100");
    if (newTotalXP >= 1000) badges.push("xp_1000");
    if (newTotalXP >= 5000) badges.push("xp_5000");
    for (const b of badges) {
      await supabase.from("user_achievements").insert({ user_id: userId, badge_key: b }).then(() => {}, () => {});
    }

    return { ...grade, xp_awarded: xp, lesson_completed: lessonCompleted, hearts: newHearts, streak: newStreak, total_xp: newTotalXP };
  });

/* --------------------- Get user stats --------------------- */
export const getUserStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    let { data: stats } = await supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle();
    if (!stats) {
      const { data: created } = await supabase.from("user_stats").insert({ user_id: userId }).select("*").single();
      stats = created;
    }
    // Refill hearts if needed
    if (stats && stats.hearts === 0 && stats.hearts_refill_at && new Date(stats.hearts_refill_at) <= new Date()) {
      const { data: refilled } = await supabase.from("user_stats")
        .update({ hearts: 5, hearts_refill_at: null }).eq("user_id", userId).select("*").single();
      if (refilled) stats = refilled;
    }
    const { data: badges } = await supabase.from("user_achievements").select("badge_key,earned_at").eq("user_id", userId);
    return { stats, badges: badges ?? [] };
  });

/* --------------------- Progress for book / course --------------------- */
export const getBookProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ bookId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: lessons } = await supabase.from("lessons").select("id").eq("book_id", data.bookId);
    const ids = (lessons ?? []).map(l => l.id);
    if (ids.length === 0) return { total: 0, completed: 0, percent: 0 };
    const { data: prog } = await supabase
      .from("user_lesson_progress").select("lesson_id,status")
      .eq("user_id", userId).in("lesson_id", ids);
    const done = (prog ?? []).filter(p => p.status === "completed").length;
    return { total: ids.length, completed: done, percent: Math.round((done / ids.length) * 100) };
  });

export const getCourseProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ courseId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: lessons } = await supabase.from("lessons").select("id").eq("course_id", data.courseId);
    const ids = (lessons ?? []).map(l => l.id);
    if (ids.length === 0) return { total: 0, completed: 0, percent: 0 };
    const { data: prog } = await supabase
      .from("user_lesson_progress").select("lesson_id,status")
      .eq("user_id", userId).in("lesson_id", ids);
    const done = (prog ?? []).filter(p => p.status === "completed").length;
    return { total: ids.length, completed: done, percent: Math.round((done / ids.length) * 100) };
  });

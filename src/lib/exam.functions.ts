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
    if (res.status === 429) throw new Error("محدودیت درخواست. کمی بعد دوباره تلاش کنید.");
    if (res.status === 402) throw new Error("اعتبار هوش مصنوعی تمام شده است.");
    throw new Error(`AI error: ${res.status} ${txt}`);
  }
  return res.json();
}

type MinSupabase = { from: (t: "user_roles") => { select: (c: string) => { eq: (col: string, val: string) => Promise<{ data: Array<{ role: string }> | null }> } } };
async function requireStaff(supabase: unknown, userId: string) {
  const sb = supabase as MinSupabase;
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("teacher")) {
    throw new Error("دسترسی غیرمجاز.");
  }
}

/* ---------- Translate original_text (HTML-preserving) ---------- */
export const translateLessonText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    text: z.string().min(1).max(50_000),
    targetLang: z.string().default("fa"),
  }))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const targetName = data.targetLang === "ar" ? "عربی" : data.targetLang === "en" ? "انگلیسی" : "فارسی";
    const system = `تو یک مترجم متخصص علوم حوزوی/دینی هستی. متن ورودی را به زبان ${targetName} ترجمه کن.
قوانین بسیار مهم:
- اگر متن شامل تگ‌های HTML است، ساختار HTML را دقیقاً حفظ کن و فقط متن داخل تگ‌ها را ترجمه کن. تگ‌ها، ویژگی‌ها (attributes)، کلاس‌ها، و ساختار را عیناً نگه دار.
- محتوای داخل <script>, <style>, و کد ها را ترجمه نکن.
- ترجمه طبیعی، روان و متناسب با ادبیات حوزوی باشد.
- فقط متن ترجمه‌شده را برگردان بدون هیچ توضیح اضافه.`;
    const json = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: data.text },
      ],
    });
    const translated = json.choices?.[0]?.message?.content ?? "";
    return { translation: String(translated).trim() };
  });

/* ---------- Translate ALL lessons of a book at once ---------- */
export const translateBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    bookId: z.string().uuid(),
    targetLang: z.string().default("fa"),
    overwrite: z.boolean().default(false),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireStaff(supabase, userId);

    const { data: lessons, error } = await supabase
      .from("lessons")
      .select("id,title,original_text,translation")
      .eq("book_id", data.bookId)
      .order("sort_order");
    if (error) throw new Error(error.message);
    if (!lessons || lessons.length === 0) throw new Error("درسی برای ترجمه یافت نشد.");

    const targetName = data.targetLang === "ar" ? "عربی" : data.targetLang === "en" ? "انگلیسی" : "فارسی";
    const system = `تو یک مترجم متخصص علوم حوزوی/دینی هستی. متن ورودی را به زبان ${targetName} ترجمه کن.
قوانین:
- اگر متن شامل تگ‌های HTML است، ساختار HTML را دقیقاً حفظ کن و فقط متن داخل تگ‌ها را ترجمه کن.
- محتوای داخل <script>, <style>, و کدها را ترجمه نکن.
- ترجمه طبیعی، روان و متناسب با ادبیات حوزوی باشد.
- فقط متن ترجمه‌شده را برگردان بدون هیچ توضیح اضافه.`;

    let translated = 0;
    let skipped = 0;
    for (const l of lessons) {
      const src = (l.original_text ?? "").trim();
      if (!src) { skipped++; continue; }
      if (!data.overwrite && (l.translation ?? "").trim()) { skipped++; continue; }
      try {
        const json = await callAI({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: src.slice(0, 50_000) },
          ],
        });
        const out = String(json.choices?.[0]?.message?.content ?? "").trim();
        if (!out) { skipped++; continue; }
        const { error: uerr } = await supabase.from("lessons").update({ translation: out }).eq("id", l.id);
        if (uerr) throw new Error(uerr.message);
        translated++;
      } catch (e) {
        // If AI credit / rate limits hit, stop and report progress
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("اعتبار") || msg.includes("محدودیت")) {
          return { translated, skipped, total: lessons.length, stopped: true, reason: msg };
        }
        skipped++;
      }
    }
    return { translated, skipped, total: lessons.length, stopped: false };
  });

/* ---------- Owner-only: get a magic-link to sign in as any user ---------- */
export const impersonateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    targetUserId: z.string().uuid(),
    redirectPath: z.string().default("/courses"),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Only owners may impersonate — verified via the same RLS-backed function used in policies.
    const { data: isOwner } = await supabase.rpc("has_role", { _user_id: userId, _role: "owner" });
    if (!isOwner) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target, error: gerr } = await supabaseAdmin.auth.admin.getUserById(data.targetUserId);
    if (gerr || !target?.user?.email) throw new Error("کاربر هدف یافت نشد یا ایمیل ندارد.");

    const origin = process.env.SITE_URL
      ?? process.env.PUBLIC_SITE_URL
      ?? "";
    const redirectTo = origin ? `${origin}${data.redirectPath}` : undefined;

    const { data: link, error: lerr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: target.user.email,
      options: redirectTo ? { redirectTo } : undefined,
    });
    if (lerr || !link?.properties?.action_link) throw new Error(lerr?.message ?? "خطا در ساخت لینک ورود.");
    return { actionLink: link.properties.action_link, targetEmail: target.user.email };
  });

/* ---------- Admin/Owner: aggregate progress for all students ---------- */
export const listAllUsersProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (roleRows ?? []).map(r => r.role as string);
    if (!roles.includes("admin") && !roles.includes("owner")) {
      throw new Error("دسترسی غیرمجاز.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles }, { data: stats }, { data: progress }, { data: allRoles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,full_name,created_at"),
      supabaseAdmin.from("user_stats").select("user_id,total_xp,weekly_xp,current_streak,longest_streak,hearts,league,last_activity_date"),
      supabaseAdmin.from("user_lesson_progress").select("user_id,status"),
      supabaseAdmin.from("user_roles").select("user_id,role"),
    ]);

    const statsMap = new Map((stats ?? []).map(s => [s.user_id, s]));
    const completedMap = new Map<string, number>();
    (progress ?? []).forEach(p => {
      if (p.status === "completed") completedMap.set(p.user_id, (completedMap.get(p.user_id) ?? 0) + 1);
    });
    const roleMap = new Map<string, string>();
    (allRoles ?? []).forEach(r => {
      const rank = (x: string) => x === "owner" ? 4 : x === "admin" ? 3 : x === "teacher" ? 2 : 1;
      const cur = roleMap.get(r.user_id);
      if (!cur || rank(r.role as string) > rank(cur)) roleMap.set(r.user_id, r.role as string);
    });

    return (profiles ?? []).map(p => {
      const s = statsMap.get(p.id);
      return {
        id: p.id,
        full_name: p.full_name,
        role: (roleMap.get(p.id) ?? "student"),
        total_xp: s?.total_xp ?? 0,
        weekly_xp: s?.weekly_xp ?? 0,
        current_streak: s?.current_streak ?? 0,
        longest_streak: s?.longest_streak ?? 0,
        hearts: s?.hearts ?? 5,
        league: s?.league ?? "bronze",
        last_activity_date: s?.last_activity_date ?? null,
        completed_lessons: completedMap.get(p.id) ?? 0,
        created_at: p.created_at,
      };
    }).sort((a, b) => b.total_xp - a.total_xp);
  });

/* ---------- Generate 40 non-duplicate important questions from book ---------- */
export const generateBookExamQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ bookId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireStaff(supabase, userId);

    const { data: lessons } = await supabase
      .from("lessons")
      .select("title,original_text,translation,explanation,content")
      .eq("book_id", data.bookId)
      .order("sort_order");
    if (!lessons || lessons.length === 0) throw new Error("این کتاب هنوز درسی ندارد.");

    const combined = lessons
      .map((l, i) => `درس ${i + 1}: ${l.title}\n${[l.original_text, l.translation, l.explanation, l.content].filter(Boolean).join("\n")}`)
      .join("\n\n---\n\n")
      .slice(0, 120_000);

    const system = `تو یک استاد باتجربه علوم حوزوی هستی. از متن کامل کتاب زیر، دقیقاً ۴۰ سوال مهم امتحانی و غیر تکراری استخراج کن.
- سوال‌ها باید متنوع باشند (تعریف، توضیح، تحلیل، مقایسه، مثال).
- تکراری نباشند و مفاهیم مختلف کتاب را پوشش دهند.
- سوال‌ها کوتاه، دقیق و مناسب امتحان باشند.
- به زبان اصلی متن (فارسی/عربی) بنویس.`;
    const json = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: combined },
      ],
      tools: [{
        type: "function",
        function: {
          name: "save_questions",
          parameters: {
            type: "object",
            properties: {
              questions: { type: "array", items: { type: "string" }, minItems: 20, maxItems: 40 },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "save_questions" } },
    });
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("خروجی AI نامعتبر");
    const parsed = JSON.parse(args) as { questions: string[] };
    const questions = parsed.questions.slice(0, 40);

    // Replace existing
    await supabase.from("book_exam_questions").delete().eq("book_id", data.bookId);
    const rows = questions.map((q, i) => ({
      book_id: data.bookId,
      question: q,
      sort_order: i,
      created_by: userId,
    }));
    if (rows.length) {
      const { error } = await supabase.from("book_exam_questions").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { count: rows.length };
  });

/* ---------- Answer exam questions from uploaded files ---------- */
export const answerBookExamFromFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    bookId: z.string().uuid(),
    filePaths: z.array(z.string()).min(1).max(20),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: lessons } = await supabase
      .from("lessons")
      .select("title,original_text,translation,explanation,content")
      .eq("book_id", data.bookId)
      .order("sort_order");
    if (!lessons || lessons.length === 0) throw new Error("این کتاب درسی ندارد.");

    const bookContext = lessons
      .map((l, i) => `درس ${i + 1}: ${l.title}\n${[l.original_text, l.translation, l.explanation, l.content].filter(Boolean).join("\n")}`)
      .join("\n\n---\n\n")
      .slice(0, 100_000);

    // Download files, convert to base64 data URLs (images only for AI vision; PDFs skipped from vision)
    const parts: Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }> = [];
    parts.push({
      type: "text",
      text: `متن کامل کتاب (مرجع پاسخ):\n\n${bookContext}\n\n---\n\nدر ادامه، تصاویر برگه‌های امتحانی/سوال داده می‌شود. هر سوال را دقیقاً از متن کتاب استخراج و پاسخ کامل و دقیق بده. خروجی را به صورت مرتب و شماره‌گذاری‌شده (Markdown) با ساختار زیر بنویس:\n\n### سوال ۱: [متن سوال]\n**پاسخ:** ...\n\n### سوال ۲: ...\n\nاگر پاسخ در کتاب نیست، صریح بنویس «در متن کتاب یافت نشد».`,
    });

    let skippedPdf = 0;
    for (const path of data.filePaths) {
      const { data: file } = await supabase.storage.from("exam-files").download(path);
      if (!file) continue;
      const buf = new Uint8Array(await file.arrayBuffer());
      const mime = file.type || (path.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
      if (mime.startsWith("image/")) {
        let bin = "";
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        const b64 = btoa(bin);
        parts.push({ type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } });
      } else {
        skippedPdf += 1;
      }
    }

    if (parts.length === 1) throw new Error("هیچ فایل تصویری معتبری برای پردازش یافت نشد. لطفاً تصاویر (jpg/png) بارگذاری کنید.");

    const json = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "تو یک استاد علوم حوزوی هستی که از تصاویر برگه امتحانی، سوالات را می‌خوانی و از متن کتاب پاسخ کامل و منظم می‌دهی." },
        { role: "user", content: parts },
      ],
    });
    const answer = json.choices?.[0]?.message?.content ?? "";
    return {
      answer: String(answer),
      skippedPdf,
    };
  });

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

async function requireStaff(supabase: { from: (t: string) => { select: (c: string) => { eq: (col: string, val: string) => Promise<{ data: { role: string }[] | null }> } } }, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
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

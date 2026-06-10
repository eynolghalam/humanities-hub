import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LessonSchema = z.object({
  title: z.string(),
  original_text: z.string().default(""),
  translation: z.string().default(""),
  explanation: z.string().default(""),
});

export const splitBookIntoLessons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      text: z.string().min(20).max(200_000),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Role check: only admin/teacher may consume AI credits to import books
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (roleRows ?? []).map(r => r.role as string);
    if (!roles.includes("admin") && !roles.includes("teacher")) {
      throw new Error("Unauthorized: only admin or teacher can import books.");
    }
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const system = `You are an expert at parsing religious/educational books (Arabic/Persian) into structured lessons.
Split the provided book text into an ordered list of lessons (دروس). Each chapter/فصل/باب/درس becomes one lesson.
For each lesson extract:
- title: concise lesson title (in source language)
- original_text: the main source text of the lesson (Arabic if present)
- translation: any translation present (e.g. Persian/English) or empty string
- explanation: any commentary/توضیح/شرح present or empty string
Return ONLY valid JSON matching the provided schema. Do not invent content; use empty string if a part is missing.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.text },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_lessons",
              description: "Save the parsed lessons",
              parameters: {
                type: "object",
                properties: {
                  lessons: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        original_text: { type: "string" },
                        translation: { type: "string" },
                        explanation: { type: "string" },
                      },
                      required: ["title", "original_text", "translation", "explanation"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["lessons"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_lessons" } },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) throw new Error("Rate limit exceeded. Try again shortly.");
      if (res.status === 402) throw new Error("AI credits required. Add credits in Settings.");
      throw new Error(`AI error: ${res.status} ${txt}`);
    }

    const json = await res.json();
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No structured output from AI");
    const parsed = JSON.parse(args);
    const lessons = z.array(LessonSchema).parse(parsed.lessons);
    return { lessons };
  });

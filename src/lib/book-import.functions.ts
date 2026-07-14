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
    const { callAIWithFallback } = await import("./ai-fallback.server");

    const system = `You are an expert at parsing religious/educational books (Arabic/Persian) into structured lessons.
Split the provided book text into an ordered list of lessons (دروس). Each chapter/فصل/باب/درس becomes one lesson.
For each lesson extract:
- title: concise lesson title (in source language)
- original_text: the main source text of the lesson (Arabic if present)
- translation: any translation present (e.g. Persian/English) or empty string
- explanation: any commentary/توضیح/شرح present or empty string
Return ONLY valid JSON matching the provided schema. Do not invent content; use empty string if a part is missing.`;

    const json = await callAIWithFallback({
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
    });

    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No structured output from AI");
    const parsed = JSON.parse(args);
    const lessons = z.array(LessonSchema).parse(parsed.lessons);
    return { lessons };
  });

const BoundarySchema = z.object({
  title: z.string(),
  start_marker: z.string().min(4),
});

export const detectBookChapterBoundaries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ text: z.string().min(20).max(400_000) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (roleRows ?? []).map(r => r.role as string);
    if (!roles.includes("admin") && !roles.includes("teacher")) {
      throw new Error("Unauthorized");
    }
    const { callAIWithFallback } = await import("./ai-fallback.server");

    // Strip HTML tags for the AI to reduce noise; markers will be matched
    // against the plain-text version of the source.
    const plain = data.text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const truncated = plain.slice(0, 180_000);

    const system = `You are an expert at parsing Arabic/Persian religious/educational book text and identifying chapter/lesson boundaries (فصل / باب / درس).
Return an ORDERED list of chapter/lesson boundaries found in the provided text.
For EACH boundary return:
- title: concise chapter/lesson title in the source language.
- start_marker: a VERBATIM contiguous snippet of 40-120 characters copied EXACTLY from the source text, marking where this chapter begins (typically the heading line + first words). It MUST appear verbatim in the input so it can be located by exact string match. Do NOT paraphrase, translate, or add ellipsis.
Rules:
- Include every chapter, in the order they appear.
- Do not invent chapters. If the text has no clear chapters, return a single boundary at the very start.`;

    const json = await callAIWithFallback({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: truncated },
      ],
      tools: [{
        type: "function",
        function: {
          name: "save_boundaries",
          description: "Save detected chapter boundaries",
          parameters: {
            type: "object",
            properties: {
              boundaries: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    start_marker: { type: "string" },
                  },
                  required: ["title", "start_marker"],
                  additionalProperties: false,
                },
              },
            },
            required: ["boundaries"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "save_boundaries" } },
    });
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No structured output from AI");
    const parsed = JSON.parse(args);
    const boundaries = z.array(BoundarySchema).parse(parsed.boundaries);
    return { boundaries };
  });

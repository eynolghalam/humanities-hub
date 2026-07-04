import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCourses from "./tools/list_courses";
import listBooks from "./tools/list_books";
import listLessons from "./tools/list_lessons";
import getLesson from "./tools/get_lesson";
import myProgress from "./tools/my_progress";
import listExamQuestions from "./tools/list_exam_questions";

// The OAuth issuer MUST be the direct Supabase host (not the .lovable.cloud proxy).
// VITE_SUPABASE_PROJECT_ID is inlined at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "hozatona-mcp",
  title: "Hozatona",
  version: "0.1.0",
  instructions:
    "Tools for the Hozatona learning platform. Browse courses, books, and lessons; read lesson text, translation, and explanation; review your progress; and list exam questions for a book. All calls act as the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCourses, listBooks, listLessons, getLesson, myProgress, listExamQuestions],
});

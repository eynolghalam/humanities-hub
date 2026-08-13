import { createFileRoute } from "@tanstack/react-router";
import { QASection } from "@/components/QASection";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/questions")({
  component: QuestionsPage,
  head: () => ({
    meta: [
      { title: "پرسش و پاسخ با استاد | حوزتنا" },
      { name: "description", content: "پرسش‌های خود را از استاد بپرسید و پاسخ‌ها را در یک جا دنبال کنید." },
      { property: "og:title", content: "پرسش و پاسخ با استاد | حوزتنا" },
      { property: "og:description", content: "فضای گفتگوی دانشجو و استاد در حوزتنا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function QuestionsPage() {
  const { isAdmin, isTeacher, isOwner } = useAuth();
  const isStaff = isAdmin || isTeacher || isOwner;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-3xl font-extrabold">پرسش و پاسخ</h1>
      <QASection
        showAll
        title={isStaff ? "پرسش‌های دانشجویان" : "پرسش‌های من"}
      />
    </div>
  );
}

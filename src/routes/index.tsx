import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import * as Icons from "lucide-react";
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  ChevronLeft,
  CirclePlay,
  GraduationCap,
  Library,
  MessageCircleQuestion,
  Route as RouteIcon,
  Sparkles,
  Users,
} from "lucide-react";
import heroDefault from "@/assets/hozatona-hero.jpg";
import manuscriptsDefault from "@/assets/manuscripts.jpg";
import studyCircleDefault from "@/assets/study-circle.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "حوزتنا | آموزش آنلاین علوم حوزوی" },
      { name: "description", content: "دروس، کتاب‌ها و مسیرهای آموزشی علوم حوزوی با دسترسی همیشگی و یادگیری مرحله‌به‌مرحله." },
      { property: "og:title", content: "حوزتنا | آموزش آنلاین علوم حوزوی" },
      { property: "og:description", content: "دروس، کتاب‌ها و مسیرهای آموزشی علوم حوزوی با دسترسی همیشگی." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Setting = { key: string; value_fa: string | null; value_en: string | null; value_ar: string | null };
type Block = {
  id: string; kind: string; icon: string | null; image_url: string | null;
  title_fa: string | null; title_en: string | null; title_ar: string | null;
  body_fa: string | null; body_en: string | null; body_ar: string | null;
  sort_order: number; visible: boolean;
};

const defaultFeatures = [
  { id: "f1", icon: "BookOpen", title: "دسترسی آسان", body: "در هر زمان و مکان", image_url: null },
  { id: "f2", icon: "GraduationCap", title: "اساتید مجرب", body: "آموزش با شیوه‌ای مؤثر", image_url: null },
  { id: "f3", icon: "BookMarked", title: "آزمون و ارزیابی", body: "برای سنجش پیشرفت", image_url: null },
  { id: "f4", icon: "CirclePlay", title: "کلاس‌های تعاملی", body: "محتوای چندرسانه‌ای", image_url: null },
];

const defaultEditorial = [
  { id: "e1", icon: "Library", title: "گنجینه‌ای از متون معتبر حوزوی", body: "کتاب‌ها و درس‌ها را در یک مسیر روشن و منظم دنبال کنید.", image_url: manuscriptsDefault },
  { id: "e2", icon: "Users", title: "حلقه‌های علمی و پرسش از استاد", body: "پرسش‌های درسی خود را مطرح کنید و پاسخ استاد را دریافت کنید.", image_url: studyCircleDefault },
];

function Index() {
  const { t, dir, pick } = useI18n();
  const { user } = useAuth();
  const { data: settings } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*");
      const map: Record<string, Setting> = {};
      (data ?? []).forEach((setting: Setting) => { map[setting.key] = setting; });
      return map;
    },
  });
  const { data: blocks } = useQuery({
    queryKey: ["homepage_blocks"],
    queryFn: async () => {
      const { data } = await supabase.from("homepage_blocks").select("*").eq("visible", true).order("sort_order");
      return (data ?? []) as Block[];
    },
  });
  const { data: courses } = useQuery({
    queryKey: ["homepage-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id,title,description,books(count)").order("sort_order").limit(6);
      return data ?? [];
    },
  });

  const get = (key: string, fallback: string) => {
    const setting = settings?.[key];
    return setting ? (pick(setting.value_fa, setting.value_en, setting.value_ar) || fallback) : fallback;
  };
  const mappedBlocks = (blocks ?? []).map((block) => ({
    id: block.id,
    kind: block.kind,
    icon: block.icon,
    title: pick(block.title_fa, block.title_en, block.title_ar),
    body: pick(block.body_fa, block.body_en, block.body_ar),
    image_url: block.image_url,
  }));
  const featureBlocks = mappedBlocks.filter((block) => block.kind === "feature");
  const editorialBlocks = mappedBlocks.filter((block) => block.kind !== "feature");
  const features = featureBlocks.length > 0 ? featureBlocks.slice(0, 4) : defaultFeatures;
  const editorials = editorialBlocks.length > 0 ? editorialBlocks.slice(0, 2) : defaultEditorial;
  const heroImage = settings?.hero_image_url?.value_fa || heroDefault;
  const totalBooks = (courses ?? []).reduce((sum, course) => sum + ((course.books as unknown as { count: number }[])?.[0]?.count ?? 0), 0);
  const primaryTarget = user ? "/courses" : "/auth";

  const renderIcon = (name: string | null) => {
    if (!name) return BookOpen;
    return (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ?? BookOpen;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-16">
        <section className="container mx-auto px-4 pt-5 md:pt-8">
          <div className="relative min-h-[510px] overflow-hidden rounded-lg bg-primary shadow-elegant md:min-h-[560px]">
            <img src={heroImage} alt={get("hero_image_alt", "طلبه در حال مطالعه در کتابخانه حوزوی")} width={1536} height={900} className="absolute inset-0 h-full w-full object-cover object-left" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_5%,color-mix(in_oklab,var(--primary)_35%,transparent)_52%,var(--primary)_88%)]" />
            <div className="relative z-10 flex min-h-[510px] max-w-2xl flex-col items-start justify-center px-6 py-14 text-primary-foreground md:min-h-[560px] md:px-14">
              <span className="mb-5 inline-flex items-center gap-2 rounded-md border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />{get("tagline", t("tagline"))}
              </span>
              <h1 className="max-w-xl text-4xl font-extrabold leading-[1.4] md:text-6xl">{get("hero_title", t("heroTitle"))}</h1>
              <p className="mt-5 max-w-lg text-base leading-8 text-primary-foreground/80 md:text-lg">{get("hero_sub", t("heroSub"))}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-background text-foreground shadow-soft hover:bg-background/90">
                  <Link to={primaryTarget}><CirclePlay className="h-5 w-5" />{get("cta_primary", t("start"))}</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  <Link to={user ? "/journey" : "/auth"}>{get("cta_secondary", "مشاهده مسیر آموزشی")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto -mt-7 px-7 relative z-20">
          <div className="grid overflow-hidden rounded-lg border border-border bg-card shadow-soft sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = renderIcon(feature.icon);
              return <div key={feature.id} className="flex min-h-28 items-center gap-4 border-b border-border p-5 last:border-b-0 sm:border-e lg:border-b-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
                <div><h2 className="font-bold">{feature.title}</h2><p className="mt-1 text-xs text-muted-foreground">{feature.body}</p></div>
              </div>;
            })}
          </div>
        </section>

        <section className="container mx-auto px-4 pt-20">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div><p className="text-xs font-bold text-primary">{get("courses_eyebrow", "نقشه راه تحصیل")}</p><h2 className="mt-2 text-2xl font-extrabold md:text-3xl">{get("courses_title", "درس‌ها و پایه‌های آموزشی")}</h2></div>
            {user && <Link to="/courses" className="flex items-center gap-1 text-sm font-bold text-primary">مشاهده همه <ChevronLeft className={`h-4 w-4 ${dir === "ltr" ? "rotate-180" : ""}`} /></Link>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(courses ?? []).map((course, index) => {
              const bookCount = (course.books as unknown as { count: number }[])?.[0]?.count ?? 0;
              return <Link key={course.id} to={user ? "/courses/$courseId" : "/auth"} params={user ? { courseId: course.id } : undefined} className="group min-h-48 rounded-lg border border-border bg-card p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-elegant">
                <div className="flex items-start justify-between"><span className="text-4xl font-extrabold text-primary/20">{String(index + 1).padStart(2, "0")}</span><div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary"><BookOpen className="h-5 w-5 text-primary" /></div></div>
                <h3 className="mt-7 text-xl font-bold group-hover:text-primary">{course.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{course.description || `${bookCount} کتاب در این پایه`}</p>
              </Link>;
            })}
            {(courses?.length ?? 0) === 0 && ["ادبیات عرب", "منطق و عقاید", "فقه و اصول"].map((title, index) => <div key={title} className="min-h-48 rounded-lg border border-border bg-card p-6 shadow-soft"><span className="text-4xl font-extrabold text-primary/20">۰{index + 1}</span><h3 className="mt-8 text-xl font-bold">{title}</h3><p className="mt-2 text-sm text-muted-foreground">مجموعه دروس مرحله‌بندی‌شده</p></div>)}
          </div>
        </section>

        <section className="container mx-auto px-4 pt-20">
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="relative min-h-[430px] overflow-hidden rounded-lg bg-primary lg:col-span-8">
              <img src={editorials[0]?.image_url || manuscriptsDefault} alt={editorials[0]?.title || "کتاب‌های علوم اسلامی"} width={900} height={600} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-55" />
              <div className="absolute inset-0 bg-[linear-gradient(0deg,var(--primary),transparent_75%)]" />
              <div className="absolute inset-x-0 bottom-0 p-7 text-primary-foreground md:p-10"><span className="text-xs font-bold text-primary-foreground/70">{get("featured_eyebrow", "انتخاب حوزتنا")}</span><h2 className="mt-2 max-w-2xl text-2xl font-extrabold md:text-3xl">{editorials[0]?.title}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-primary-foreground/75">{editorials[0]?.body}</p></div>
            </div>
            <div className="flex flex-col gap-5 lg:col-span-4">
              <article className="flex-1 rounded-lg border border-border bg-card p-6 shadow-soft"><MessageCircleQuestion className="h-7 w-7 text-primary" /><h3 className="mt-5 text-xl font-bold">{editorials[1]?.title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{editorials[1]?.body}</p>{user && <Button asChild variant="link" className="mt-4 px-0"><Link to="/questions">ورود به پرسش و پاسخ <ArrowLeft /></Link></Button>}</article>
              <article className="rounded-lg bg-primary p-6 text-primary-foreground shadow-elegant"><RouteIcon className="h-7 w-7" /><h3 className="mt-4 text-xl font-bold">{get("journey_title", "مسیر علمی خود را منظم بسازید")}</h3><p className="mt-2 text-sm leading-7 text-primary-foreground/75">{get("journey_body", "از نخستین درس تا پایان هر پایه، پیشرفت خود را گام‌به‌گام دنبال کنید.")}</p><Button asChild className="mt-5 bg-background text-foreground hover:bg-background/90"><Link to={user ? "/journey" : "/auth"}>{get("journey_cta", "مشاهده مسیر آموزشی")}</Link></Button></article>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pt-10">
          <div className="grid rounded-lg border border-border bg-card shadow-soft sm:grid-cols-3">
            {[{ value: `${courses?.length ?? 0}+`, label: get("stat_courses", "پایه آموزشی"), icon: GraduationCap }, { value: `${totalBooks}+`, label: get("stat_books", "کتاب درسی"), icon: Library }, { value: "همیشگی", label: get("stat_access", "دسترسی به آموزش"), icon: CirclePlay }].map((stat) => <div key={stat.label} className="flex items-center justify-center gap-4 border-b border-border p-7 last:border-b-0 sm:border-b-0 sm:border-e"><stat.icon className="h-7 w-7 text-primary" /><div><strong className="block text-2xl">{stat.value}</strong><span className="text-xs text-muted-foreground">{stat.label}</span></div></div>)}
          </div>
        </section>
      </main>
      <footer className="border-t border-border bg-primary py-10 text-primary-foreground"><div className="container mx-auto flex flex-col items-center justify-between gap-5 px-4 text-center md:flex-row md:text-start"><div><div className="flex items-center justify-center gap-2 text-xl font-extrabold md:justify-start"><BookOpen className="h-6 w-6" />{get("app_name", t("appName"))}</div><p className="mt-2 text-sm text-primary-foreground/65">{get("footer_text", "آموزش پیوسته و ساختارمند علوم حوزوی")}</p></div><p className="text-xs text-primary-foreground/55">{get("footer_copyright", "تمامی حقوق برای حوزتنا محفوظ است.")}</p></div></footer>
    </div>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import * as Icons from "lucide-react";
import { ArrowLeft, BookOpen, Sparkles, Smartphone } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "حوزتنا | پلتفرم آموزشی علوم حوزوی" },
      { name: "description", content: "حوزتنا — پلتفرم آموزشی نوین علوم حوزوی." },
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

function Index() {
  const { t, dir, pick } = useI18n();
  const { user } = useAuth();

  const { data: settings } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*");
      const map: Record<string, Setting> = {};
      (data ?? []).forEach((s: Setting) => { map[s.key] = s; });
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

  const get = (key: string, fallback: string) => {
    const s = settings?.[key];
    return s ? (pick(s.value_fa, s.value_en, s.value_ar) || fallback) : fallback;
  };

  const heroTitle = get("hero_title", t("heroTitle"));
  const heroSub = get("hero_sub", t("heroSub"));
  const ctaPrimary = get("cta_primary", t("start"));
  const tagline = get("tagline", t("tagline"));
  const heroImage = settings?.["hero_image_url"]?.value_fa || null;

  const renderIcon = (name: string | null) => {
    const fallback = BookOpen;
    if (!name) return fallback;
    const Comp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
    return Comp ?? fallback;
  };

  const defaultBlocks = [
    { id: "d1", icon: "BookOpen", title: t("feature1Title"), body: t("feature1"), image_url: null },
    { id: "d2", icon: "Sparkles", title: t("feature2Title"), body: t("feature2"), image_url: null },
    { id: "d3", icon: "Smartphone", title: t("feature3Title"), body: t("feature3"), image_url: null },
  ];

  const displayBlocks = (blocks && blocks.length > 0)
    ? blocks.map(b => ({
        id: b.id,
        icon: b.icon,
        title: pick(b.title_fa, b.title_en, b.title_ar),
        body: pick(b.body_fa, b.body_en, b.body_ar),
        image_url: b.image_url,
      }))
    : defaultBlocks;

  // Determine the target route based on authentication status
  const handleStartLearning = () => {
    if (user) {
      // User is authenticated, navigate to courses
      window.location.href = "/courses";
    } else {
      // User is not authenticated, navigate to auth page
      window.location.href = "/auth";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-hero opacity-10" />
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
          <div className="container relative mx-auto px-4 py-24 md:py-32">
            <div className={`grid items-center gap-12 ${heroImage ? "md:grid-cols-2" : ""}`}>
              <div className={heroImage ? "" : "mx-auto max-w-3xl text-center"}>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  {tagline}
                </span>
                <h1 className="mt-6 text-4xl font-extrabold tracking-tight md:text-6xl">{heroTitle}</h1>
                <p className="mt-6 text-lg text-muted-foreground md:text-xl">{heroSub}</p>
                <div className={`mt-10 flex flex-wrap items-center gap-3 ${heroImage ? "" : "justify-center"}`}>
                  <Button 
                    size="lg" 
                    className="bg-hero text-primary-foreground shadow-elegant hover:opacity-95 gap-2 cursor-pointer"
                    onClick={handleStartLearning}
                  >
                    {ctaPrimary}
                    <ArrowLeft className={`h-4 w-4 ${dir === "ltr" ? "rotate-180" : ""}`} />
                  </Button>
                </div>
              </div>
              {heroImage && (
                <div className="relative">
                  <img src={heroImage} alt={heroTitle} className="rounded-3xl shadow-elegant w-full object-cover max-h-[480px]" />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="container mx-auto grid gap-6 px-4 py-16 md:grid-cols-2 lg:grid-cols-3">
          {displayBlocks.map(b => {
            const Icon = renderIcon(b.icon ?? null);
            return (
              <div key={b.id} className="bg-card-soft rounded-2xl border border-border p-6 shadow-soft">
                {b.image_url ? (
                  <img src={b.image_url} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                )}
                <h3 className="mt-4 text-lg font-bold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{b.body}</p>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}

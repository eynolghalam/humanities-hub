import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { BookOpen, Sparkles, Smartphone, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "حکمت | پلتفرم آموزشی علوم انسانی" },
      { name: "description", content: "آموزش نوین علوم انسانی با دوره‌ها و درس‌های چندرسانه‌ای." },
    ],
  }),
  component: Index,
});

function Index() {
  const { t, dir } = useI18n();
  const ArrowIcon = ArrowLeft;
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-hero opacity-10" />
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
          <div className="container relative mx-auto px-4 py-24 md:py-36">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                {t("tagline")}
              </span>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight md:text-6xl">
                {t("heroTitle")}
              </h1>
              <p className="mt-6 text-lg text-muted-foreground md:text-xl">{t("heroSub")}</p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link to="/courses">
                  <Button size="lg" className="bg-hero text-primary-foreground shadow-elegant hover:opacity-95 gap-2">
                    {t("start")}
                    <ArrowIcon className={`h-4 w-4 ${dir === "ltr" ? "rotate-180" : ""}`} />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline">{t("signup")}</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto grid gap-6 px-4 py-16 md:grid-cols-3">
          {[
            { icon: BookOpen, title: t("feature1Title"), desc: t("feature1") },
            { icon: Sparkles, title: t("feature2Title"), desc: t("feature2") },
            { icon: Smartphone, title: t("feature3Title"), desc: t("feature3") },
          ].map((f, i) => (
            <div key={i} className="bg-card-soft rounded-2xl border border-border p-6 shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

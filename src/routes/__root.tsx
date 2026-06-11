import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-4 text-muted-foreground">صفحه پیدا نشد / Page not found</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          خانه / Home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <a href="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Home</a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "حوزتنا | پلتفرم آموزشی علوم حوزوی" },
      { name: "description", content: "حوزتنا — پلتفرم آموزشی نوین علوم حوزوی، دوره‌ها، کتب و درس‌های چندرسانه‌ای." },
      { property: "og:title", content: "حوزتنا | پلتفرم آموزشی علوم حوزوی" },
      { name: "twitter:title", content: "حوزتنا | پلتفرم آموزشی علوم حوزوی" },
      { property: "og:description", content: "حوزتنا — پلتفرم آموزشی نوین علوم حوزوی، دوره‌ها، کتب و درس‌های چندرسانه‌ای." },
      { name: "twitter:description", content: "حوزتنا — پلتفرم آموزشی نوین علوم حوزوی، دوره‌ها، کتب و درس‌های چندرسانه‌ای." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f7046266-9d76-4800-b8ff-6bda09efe6cd/id-preview-17174090--91a77792-0ebd-47d7-9087-42a9750bc647.lovable.a[...]" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f7046266-9d76-4800-b8ff-6bda09efe6cd/id-preview-17174090--91a77792-0ebd-47d7-9087-42a9750bc647.lovable.[...]" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <Outlet />
            <Toaster richColors position="top-center" />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

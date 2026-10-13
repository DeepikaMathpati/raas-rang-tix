import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <section className="ornate-frame w-full max-w-lg rounded-xl p-8 text-center sm:p-12">
        <p className="font-script text-3xl text-ember">Lost in the celebration?</p>
        <h1 className="mt-2 text-7xl text-gold-gradient">404</h1>
        <p className="mt-4 text-muted-foreground">
          This page could not be found. The event is still waiting for you.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="rounded-full bg-gold-gradient px-6 py-3 font-display text-sm text-primary-foreground">
            Back to Home
          </Link>
          <Link to="/passes" className="rounded-full border border-gold/60 px-6 py-3 font-display text-sm text-gold-soft">
            Explore Passes
          </Link>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">© 2026 Raas Mahotsav</p>
      </section>
    </main>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl text-gold">This page didn't load</h1>
        <p className="mt-2 text-muted-foreground">Something went wrong. Please try again.</p>
        <button
          type="button"
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-full bg-primary px-5 py-2 text-primary-foreground"
        >Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { title: "Raas Mahotsav 2026 — Navratri Festival in Kalaburagi" },
      {
        name: "description",
        content: "Raas Mahotsav 2026 in Kalaburagi: discover the event, venue, dates, and passes.",
      },
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1f0a0b" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Raas Mahotsav 2026" },
      { property: "og:locale", content: "en_IN" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Cormorant+Garamond:wght@400;500;600&family=Great+Vibes&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}

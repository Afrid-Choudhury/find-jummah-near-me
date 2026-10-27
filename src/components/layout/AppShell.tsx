import { Outlet, useMatches } from "react-router-dom";
import { useCanonicalUrl } from "@/hooks/useCanonicalUrl";
import { ErrorBoundary } from "./ErrorBoundary";
import { Footer } from "./Footer";
import { Header } from "./Header";

/**
 * How wide a page's content may grow on larger screens. Phones get the full
 * width either way. Set per route via `handle` in src/routes, so the shell
 * owns the decision instead of every page reinventing it:
 *   full    — the homepage: list + map across the whole screen
 *   reading — text and forms, at a comfortable line length (the default)
 *   narrow  — the original phone-width column. The masjid page stays here
 *             until it has its own desktop layout, because its pre-rendered
 *             HTML (src/prerender) is laid out at this width too.
 */
export type PageWidth = "full" | "reading" | "narrow";

export interface RouteHandle {
  width?: PageWidth;
}

const widthClass: Record<PageWidth, string> = {
  full: "w-full",
  reading: "mx-auto w-full max-w-2xl",
  narrow: "mx-auto w-full max-w-app",
};

function usePageWidth(): PageWidth {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const handle = matches[i]?.handle as RouteHandle | undefined;
    if (handle?.width) return handle.width;
  }
  return "reading";
}

export function AppShell() {
  useCanonicalUrl();
  const width = usePageWidth();

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <Header />
      <main className="flex-1 pb-8">
        <div className={widthClass[width]}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppShell, type RouteHandle } from "@/components/layout/AppShell";
import { HomePage } from "@/pages/HomePage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { Skeleton } from "@/components/ui";

// Homepage stays in the main bundle for fastest first paint on mobile.
// Detail and admin pages are code-split — admins pay for the admin bundle,
// Friday users don't.
const MasjidDetailPage = lazy(() =>
  import("@/pages/MasjidDetailPage").then((m) => ({ default: m.MasjidDetailPage })),
);
const AdminGuard = lazy(() =>
  import("@/features/admin/AdminGuard").then((m) => ({ default: m.AdminGuard })),
);
const AdminDashboardPage = lazy(() =>
  import("@/features/admin/AdminDashboardPage").then((m) => ({
    default: m.AdminDashboardPage,
  })),
);
const AdminSuggestionsPage = lazy(() =>
  import("@/features/admin/AdminSuggestionsPage").then((m) => ({
    default: m.AdminSuggestionsPage,
  })),
);
const LoginPage = lazy(() =>
  import("@/features/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const AccountPage = lazy(() =>
  import("@/features/auth/AccountPage").then((m) => ({ default: m.AccountPage })),
);
const AdminMasjidFormPage = lazy(() =>
  import("@/features/admin/AdminMasjidFormPage").then((m) => ({
    default: m.AdminMasjidFormPage,
  })),
);
const AboutPage = lazy(() =>
  import("@/pages/AboutPage").then((m) => ({ default: m.AboutPage })),
);
const ContactPage = lazy(() =>
  import("@/pages/ContactPage").then((m) => ({ default: m.ContactPage })),
);
const SuggestMasjidPage = lazy(() =>
  import("@/pages/SuggestMasjidPage").then((m) => ({ default: m.SuggestMasjidPage })),
);

function PageFallback() {
  return (
    <div className="space-y-4 px-4 pt-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-40 rounded-card" />
    </div>
  );
}

function suspended(node: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <HomePage />, handle: { width: "full" } satisfies RouteHandle },
      {
        path: "/masjid/:slug",
        element: suspended(<MasjidDetailPage />),
        handle: { width: "narrow" } satisfies RouteHandle,
      },
      { path: "/login", element: suspended(<LoginPage />) },
      { path: "/account", element: suspended(<AccountPage />) },
      { path: "/about", element: suspended(<AboutPage />) },
      { path: "/contact", element: suspended(<ContactPage />) },
      { path: "/suggest-masjid", element: suspended(<SuggestMasjidPage />) },
      {
        path: "/admin/suggestions",
        element: suspended(
          <AdminGuard>
            <AdminSuggestionsPage />
          </AdminGuard>,
        ),
      },
      {
        path: "/admin",
        element: suspended(
          <AdminGuard>
            <AdminDashboardPage />
          </AdminGuard>,
        ),
      },
      {
        path: "/admin/new",
        element: suspended(
          <AdminGuard>
            <AdminMasjidFormPage />
          </AdminGuard>,
        ),
      },
      {
        path: "/admin/masjid/:id",
        element: suspended(
          <AdminGuard>
            <AdminMasjidFormPage />
          </AdminGuard>,
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

import { Outlet } from "react-router-dom";
import { Header } from "./Header";

/**
 * Mobile-first shell: full-width on phones, a centered max-w-app column on
 * larger screens. All routed pages render inside <Outlet />.
 */
export function AppShell() {
  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col sm:border-x sm:border-line">
        <Header />
        <main className="flex-1 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { checkIsAdmin } from "@/services/adminService";

/**
 * Wraps all /admin routes. Three gates, in order:
 *   1. Supabase must be configured (admin tools need a live backend)
 *   2. User must be signed in (magic link — no passwords to manage)
 *   3. User must have an admin_users row (also enforced server-side by RLS;
 *      this check only decides what UI to show)
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const adminQuery = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: checkIsAdmin,
    enabled: !!user,
  });

  if (!isSupabaseConfigured) {
    return (
      <AdminMessage title="Backend not connected">
        Admin tools manage live data. Add your Supabase credentials to{" "}
        <code className="rounded bg-paper-sunken px-1">.env.local</code> and restart the
        dev server.
      </AdminMessage>
    );
  }

  if (authLoading || (user && adminQuery.isLoading)) {
    return <AdminMessage title="Checking access…"> </AdminMessage>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!adminQuery.data) {
    return (
      <AdminMessage title="Not authorized">
        You're signed in as {user.email}, but this account isn't an admin. Add your user
        ID to the <code className="rounded bg-paper-sunken px-1">admin_users</code> table
        (see migration 0002), then reload.
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => void supabase?.auth.signOut()}
        >
          Sign out
        </Button>
      </AdminMessage>
    );
  }

  return <>{children}</>;
}

function AdminMessage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-4 pt-6">
      <Card className="p-5">
        <h1 className="font-display text-lg font-semibold text-night">{title}</h1>
        <div className="mt-2 text-sm text-ink-muted">{children}</div>
      </Card>
    </div>
  );
}

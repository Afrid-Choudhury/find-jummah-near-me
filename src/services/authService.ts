import { supabase } from "@/lib/supabase";

/**
 * Thin wrappers over Supabase Auth so pages never import the client.
 * Email + password for everyone (users and admins alike); admin status is a
 * separate admin_users row, not a different login.
 */

function requireClient() {
  if (!supabase) {
    throw new Error("Accounts need a connected backend. Add Supabase credentials to .env.local.");
  }
  return supabase;
}

export async function signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await requireClient().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/account` },
  });
  if (error) throw new Error(error.message);
  // With "Confirm email" on, session is null until the link is clicked.
  return { needsConfirmation: data.session === null };
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await requireClient().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  const { error } = await requireClient().auth.signOut();
  if (error) throw new Error(error.message);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await requireClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/account`,
  });
  if (error) throw new Error(error.message);
}

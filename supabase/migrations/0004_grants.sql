-- Find Jummah Near Me — table grants for anon/authenticated
-- Run after 0003_accounts_and_suggestions.sql
--
-- RLS policies alone don't grant access: Postgres checks table-level
-- privileges first, then RLS. This project's template didn't carry the
-- usual default grants for newly created tables, so every anon read was
-- failing with "permission denied for table masjids" even though the
-- "masjids are publicly readable" policy was correct. Grants below mirror
-- exactly what each table's RLS policies already allow.

grant usage on schema public to anon, authenticated;

-- Public directory data: anyone reads, only admins write (enforced by RLS)
grant select on public.masjids, public.jummah_times to anon, authenticated;
grant insert, update, delete on public.masjids, public.jummah_times to authenticated;

-- Anonymous community signals: insert-only, no read/update/delete policy exists
grant insert on public.masjid_confirmations, public.masjid_reports to anon, authenticated;

-- Aggregate view PostgreSQL evaluates under the view owner, exposing counts
-- without granting direct table access to the confirmation/report rows
grant select on public.masjid_confidence to anon, authenticated;

-- Signed-in-only tables (RLS restricts to own rows / admins)
grant select, insert, update, delete on public.favorites to authenticated;
grant select on public.admin_users to authenticated;
grant select, insert, update on public.time_suggestions to authenticated;

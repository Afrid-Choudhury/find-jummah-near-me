-- Find Jummah Near Me — allow anonymous time suggestions
-- Run after 0005_remove_test_confirmation.sql
--
-- Anyone can now propose a Jummah time without signing in. The approval
-- gate is unchanged: a suggestion never touches jummah_times until an
-- admin approves it via /admin/suggestions. The with check clause below
-- makes it impossible for an anonymous insert to land as anything other
-- than unattributed and pending — it can't be attributed to someone
-- else's account, and it can't be inserted pre-approved.

alter table public.time_suggestions
  alter column user_id drop not null,
  alter column submitted_by drop not null;

create policy "anonymous users can submit suggestions"
  on public.time_suggestions for insert
  to anon
  with check (user_id is null and status = 'pending');

-- RLS policies alone don't grant table access (see CLAUDE.md's Gotchas) —
-- mirrors the anon insert-only grant pattern from 0004_grants.sql.
grant insert on public.time_suggestions to anon;

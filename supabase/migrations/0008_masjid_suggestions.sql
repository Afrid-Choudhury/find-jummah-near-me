-- Find Jummah Near Me — suggest a masjid that's missing
-- Run after 0007_masjid_editors.sql
--
-- time_suggestions only covers masjids already in the directory. This covers
-- the other half: a masjid we don't list at all. Same ownership rule as
-- everything else community-submitted — anyone may propose, nothing reaches
-- the public directory until an admin creates the masjid from it.
--
-- Deliberately no latitude/longitude: submitters don't know their masjid's
-- coordinates, and the directory's CHECK constraints on NYC bounds would
-- reject a guess. An admin geocodes and fills them in at approval time.

create table public.masjid_suggestions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  borough text check (borough is null or borough in ('Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island')),
  neighborhood text,
  phone text,
  website text,
  jummah_time time,
  notes text,
  user_id uuid references auth.users (id) on delete cascade,
  submitted_by text,                                -- name/email a logged-out submitter left
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index masjid_suggestions_status_idx on public.masjid_suggestions (status, created_at);

alter table public.masjid_suggestions enable row level security;

-- Same shape as the open time suggestions in 0006: anyone may submit, and a
-- submission can only ever land as pending. The user_id clauses stop an
-- anonymous insert from being attributed to someone else's account.
create policy "anyone can suggest a masjid"
  on public.masjid_suggestions for insert
  to anon
  with check (user_id is null and status = 'pending');

create policy "signed-in users can suggest a masjid"
  on public.masjid_suggestions for insert
  to authenticated
  with check ((user_id is null or user_id = auth.uid()) and status = 'pending');

-- Unlike time_suggestions, a submitter can't read their own back: there's no
-- public page for a masjid that doesn't exist yet, so nothing to show them.
create policy "admins read masjid suggestions"
  on public.masjid_suggestions for select
  using (public.is_admin());

create policy "admins review masjid suggestions"
  on public.masjid_suggestions for update
  using (public.is_admin())
  with check (public.is_admin());

-- RLS policies alone don't grant table access (see CLAUDE.md's Gotchas).
grant insert on public.masjid_suggestions to anon, authenticated;
grant select, update on public.masjid_suggestions to authenticated;

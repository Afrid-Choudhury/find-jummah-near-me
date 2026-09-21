-- Find Jummah Near Me — user accounts, time suggestions, report resolution
-- Run after 0002_confidence_and_admin.sql

-- ---------------------------------------------------------------------------
-- Report resolution. When an admin reviews a listing, last_reviewed_at is
-- stamped and only community signals AFTER that moment count toward the
-- displayed confidence. Old signals are kept for history, not deleted.
-- ---------------------------------------------------------------------------
alter table public.masjids
  add column last_reviewed_at timestamptz;

create or replace view public.masjid_confidence as
select
  m.id as masjid_id,
  (select count(*) from public.masjid_confirmations c
     where c.masjid_id = m.id
       and c.created_at > coalesce(m.last_reviewed_at, '-infinity'::timestamptz)) as confirmations,
  (select count(*) from public.masjid_reports r
     where r.masjid_id = m.id
       and r.created_at > coalesce(m.last_reviewed_at, '-infinity'::timestamptz)) as reports
from public.masjids m;

-- ---------------------------------------------------------------------------
-- Time suggestions. Signed-in users propose a schedule; nothing changes on
-- the public site until an admin approves it (which writes jummah_times and
-- stamps last_verified_at). Official data stays admin-owned.
-- ---------------------------------------------------------------------------
create table public.time_suggestions (
  id uuid primary key default uuid_generate_v4(),
  masjid_id uuid not null references public.masjids (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  submitted_by text not null,                      -- email snapshot for the admin queue
  khutbah_number integer not null default 1 check (khutbah_number between 1 and 5),
  khutbah_time time not null,
  iqamah_time time,
  language text not null default 'English',
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index time_suggestions_status_idx on public.time_suggestions (status, created_at);
create index time_suggestions_masjid_idx on public.time_suggestions (masjid_id);
create index time_suggestions_user_idx on public.time_suggestions (user_id);

alter table public.time_suggestions enable row level security;

create policy "signed-in users can submit their own suggestions"
  on public.time_suggestions for insert
  with check (auth.uid() = user_id);

create policy "users see their own suggestions; admins see all"
  on public.time_suggestions for select
  using (auth.uid() = user_id or public.is_admin());

create policy "admins review suggestions"
  on public.time_suggestions for update
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Notes for Supabase Auth settings (dashboard -> Authentication -> Providers):
--  * Email provider: enabled. Registration uses email + password.
--  * "Confirm email": leave ON for production. For faster local testing you
--    can turn it off so new accounts can sign in immediately.
--  * Site URL / Redirect URLs must include your deployed origin.
-- ---------------------------------------------------------------------------

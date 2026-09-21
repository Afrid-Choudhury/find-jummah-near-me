-- Find Jummah Near Me — community confidence, verification dates, admin roles
-- Run after 0001_initial_schema.sql

-- ---------------------------------------------------------------------------
-- Verification dates (shown as "Last verified" on every listing)
-- ---------------------------------------------------------------------------
alter table public.jummah_times
  add column last_verified_at timestamptz;

-- ---------------------------------------------------------------------------
-- Community confidence: anonymous confirm/report signals.
-- Users never edit official data — these are append-only counters.
-- ---------------------------------------------------------------------------
create table public.masjid_confirmations (
  id uuid primary key default gen_random_uuid(),
  masjid_id uuid not null references public.masjids (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index masjid_confirmations_masjid_idx on public.masjid_confirmations (masjid_id);

create table public.masjid_reports (
  id uuid primary key default gen_random_uuid(),
  masjid_id uuid not null references public.masjids (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index masjid_reports_masjid_idx on public.masjid_reports (masjid_id);

alter table public.masjid_confirmations enable row level security;
alter table public.masjid_reports enable row level security;

-- Anyone may add a signal; nobody may read/update/delete rows directly.
-- Counts are exposed only through the aggregate view below.
create policy "anyone can confirm a listing"
  on public.masjid_confirmations for insert with check (true);
create policy "anyone can report a listing"
  on public.masjid_reports for insert with check (true);

create view public.masjid_confidence as
select
  m.id as masjid_id,
  (select count(*) from public.masjid_confirmations c where c.masjid_id = m.id) as confirmations,
  (select count(*) from public.masjid_reports r where r.masjid_id = m.id) as reports
from public.masjids m;

-- ---------------------------------------------------------------------------
-- Admin roles. All official data is managed by admins via the dashboard.
-- Add yourself after signing in once:
--   insert into public.admin_users (user_id)
--   values ('<your auth.users id from the Authentication tab>');
-- ---------------------------------------------------------------------------
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create policy "admins can see their own admin row"
  on public.admin_users for select using (auth.uid() = user_id);

-- security definer so RLS policies on other tables can consult admin_users
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- Admin-only writes on official data (public read policies exist in 0001)
create policy "admins insert masjids" on public.masjids for insert with check (public.is_admin());
create policy "admins update masjids" on public.masjids for update using (public.is_admin());
create policy "admins delete masjids" on public.masjids for delete using (public.is_admin());

create policy "admins insert jummah times" on public.jummah_times for insert with check (public.is_admin());
create policy "admins update jummah times" on public.jummah_times for update using (public.is_admin());
create policy "admins delete jummah times" on public.jummah_times for delete using (public.is_admin());

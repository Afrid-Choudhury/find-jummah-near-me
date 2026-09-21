-- Jummah NYC — initial schema
-- Run via: supabase db push  (or paste into the SQL editor in the dashboard)

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- masjids
-- ---------------------------------------------------------------------------
create table public.masjids (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  address text not null,
  borough text not null check (borough in ('Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island')),
  neighborhood text,
  latitude double precision not null check (latitude between 40.4 and 41.0),
  longitude double precision not null check (longitude between -74.3 and -73.6),
  phone text,
  website text,
  capacity integer check (capacity > 0),
  has_womens_section boolean not null default false,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index masjids_borough_idx on public.masjids (borough);
create index masjids_location_idx on public.masjids (latitude, longitude);

-- ---------------------------------------------------------------------------
-- jummah_times — a masjid may hold multiple khutbahs
-- ---------------------------------------------------------------------------
create table public.jummah_times (
  id uuid primary key default uuid_generate_v4(),
  masjid_id uuid not null references public.masjids (id) on delete cascade,
  khutbah_number integer not null default 1 check (khutbah_number between 1 and 5),
  khutbah_time time not null,
  iqamah_time time,
  language text not null default 'English',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (masjid_id, khutbah_number)
);

create index jummah_times_masjid_idx on public.jummah_times (masjid_id);

-- ---------------------------------------------------------------------------
-- favorites — Phase 5 (auth); table created now so types stay stable
-- ---------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  masjid_id uuid not null references public.masjids (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, masjid_id)
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger masjids_updated_at before update on public.masjids
  for each row execute function public.set_updated_at();
create trigger jummah_times_updated_at before update on public.jummah_times
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Public read for directory data; writes restricted (admin dashboard in
-- Phase 6 will use an `admins` table or a service role via Edge Functions).
-- ---------------------------------------------------------------------------
alter table public.masjids enable row level security;
alter table public.jummah_times enable row level security;
alter table public.favorites enable row level security;

create policy "masjids are publicly readable"
  on public.masjids for select using (true);

create policy "jummah times are publicly readable"
  on public.jummah_times for select using (true);

create policy "users manage their own favorites"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Seed data lives in supabase/seed.sql (real Manhattan & Queens masjids).
-- Run it after migration 0002.

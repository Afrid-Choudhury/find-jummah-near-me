-- Find Jummah Near Me — tiered community trust
-- Run after 0009_masjid_suggestion_coordinates.sql
--
-- Until now a time was either admin-verified or invisible, which left 204
-- masjids showing nothing. This lets a plausible community time be published
-- and then judged in the open: it appears labelled as unverified, visitors
-- confirm or dispute it, and it retracts itself if the crowd says it's wrong.
--
-- The accuracy rule is unchanged in substance — the UI must never present a
-- community time with the confidence of a verified one. What changes is that
-- "unverified" becomes a state we can show honestly rather than a reason to
-- show nothing.

-- ---------------------------------------------------------------------------
-- Where a schedule came from.
-- last_verified_at keeps its exact meaning: an admin personally confirmed it.
-- A community time therefore has source 'community' and last_verified_at null.
-- Existing rows default to 'admin', which is correct — they were all entered
-- through the admin dashboard.
-- ---------------------------------------------------------------------------
alter table public.jummah_times
  add column source text not null default 'admin'
    check (source in ('admin', 'community'));

-- ---------------------------------------------------------------------------
-- Votes can now target one schedule instead of the whole listing.
-- Null keeps the existing meaning: a vote on the masjid as a whole.
-- ---------------------------------------------------------------------------
alter table public.masjid_confirmations
  add column jummah_time_id uuid references public.jummah_times (id) on delete cascade;

alter table public.masjid_reports
  add column jummah_time_id uuid references public.jummah_times (id) on delete cascade;

create index masjid_confirmations_time_idx
  on public.masjid_confirmations (jummah_time_id);
create index masjid_reports_time_idx
  on public.masjid_reports (jummah_time_id);

-- ---------------------------------------------------------------------------
-- The masjid-level view must now ignore per-schedule votes, or a vote on one
-- time would also inflate the listing's counters and be counted twice.
-- Same last_reviewed_at cutoff as before.
-- ---------------------------------------------------------------------------
create or replace view public.masjid_confidence as
select
  m.id as masjid_id,
  (select count(*) from public.masjid_confirmations c
     where c.masjid_id = m.id
       and c.jummah_time_id is null
       and c.created_at > coalesce(m.last_reviewed_at, '-infinity'::timestamptz)) as confirmations,
  (select count(*) from public.masjid_reports r
     where r.masjid_id = m.id
       and r.jummah_time_id is null
       and r.created_at > coalesce(m.last_reviewed_at, '-infinity'::timestamptz)) as reports
from public.masjids m;

-- Per-schedule counterpart, honouring the same review cutoff so that fixing a
-- listing clears its schedules' counters too.
create view public.jummah_time_confidence as
select
  t.id as jummah_time_id,
  (select count(*) from public.masjid_confirmations c
     where c.jummah_time_id = t.id
       and c.created_at > coalesce(m.last_reviewed_at, '-infinity'::timestamptz)) as confirmations,
  (select count(*) from public.masjid_reports r
     where r.jummah_time_id = t.id
       and r.created_at > coalesce(m.last_reviewed_at, '-infinity'::timestamptz)) as reports
from public.jummah_times t
join public.masjids m on m.id = t.masjid_id;

-- RLS is unchanged: jummah_times still admits writes only from is_admin() (0002)
-- or an approved editor for their own masjid (0007), and the vote tables remain
-- insert-only for anon. Views need their own grant (see CLAUDE.md's Gotchas).
grant select on public.jummah_time_confidence to anon, authenticated;

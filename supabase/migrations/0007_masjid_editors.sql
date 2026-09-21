-- Find Jummah Near Me — masjid editors
-- Run after 0006_open_suggestions.sql
--
-- A third class of writer, between "anyone" and "admin": a masjid's own imam,
-- board member or volunteer, approved by an admin, who can maintain that one
-- masjid's jummah_times directly instead of queueing suggestions.
--
-- This narrows architecture rule 4 in CLAUDE.md ("users signal, admins
-- write") — official data can now also be written by an approved editor, but
-- only for the masjid they were approved for. Everything else is unchanged:
-- editors cannot touch the masjids table, cannot grant themselves access, and
-- cannot write times for any other masjid. The public site is unaffected.

create table public.masjid_editors (
  user_id uuid not null references auth.users (id) on delete cascade,
  masjid_id uuid not null references public.masjids (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, masjid_id)
);

create index masjid_editors_masjid_idx on public.masjid_editors (masjid_id);

alter table public.masjid_editors enable row level security;

-- security definer so the jummah_times policies below can consult this table
-- without the caller needing read access to anyone else's grants
create or replace function public.is_masjid_editor(target_masjid_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.masjid_editors
    where user_id = auth.uid()
      and masjid_id = target_masjid_id
  );
$$;

-- Editors see their own grants; admins see all of them.
create policy "editors see their own grants"
  on public.masjid_editors for select
  using (auth.uid() = user_id or public.is_admin());

-- Only admins grant or revoke. Without this an editor could widen their own
-- access to other masjids, which would defeat the whole scoping.
create policy "admins grant editor access"
  on public.masjid_editors for insert
  with check (public.is_admin());

create policy "admins revoke editor access"
  on public.masjid_editors for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Editors write jummah_times for their own masjid.
-- These sit alongside the admin policies from 0002 — Postgres ORs permissive
-- policies together, so an admin still passes via is_admin() and an editor
-- passes via is_masjid_editor().
-- ---------------------------------------------------------------------------
create policy "editors insert their masjid times"
  on public.jummah_times for insert
  with check (public.is_masjid_editor(masjid_id));

-- `with check` matters as much as `using` here: without it an editor could
-- update a row's masjid_id and move a schedule onto a masjid they don't own.
create policy "editors update their masjid times"
  on public.jummah_times for update
  using (public.is_masjid_editor(masjid_id))
  with check (public.is_masjid_editor(masjid_id));

create policy "editors delete their masjid times"
  on public.jummah_times for delete
  using (public.is_masjid_editor(masjid_id));

-- RLS policies alone don't grant table access (see CLAUDE.md's Gotchas).
grant select, insert, delete on public.masjid_editors to authenticated;

-- ---------------------------------------------------------------------------
-- Admin dashboard helpers.
-- The client cannot read auth.users, so resolving an email to a user id (and
-- listing editors back with their emails) has to happen in the database.
-- Both are security definer, so both re-check is_admin() themselves — RLS is
-- bypassed inside a definer function.
-- ---------------------------------------------------------------------------
create or replace function public.grant_masjid_editor(
  editor_email text,
  target_masjid_id uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can grant editor access';
  end if;

  select id into target_user_id
  from auth.users
  where lower(email) = lower(trim(editor_email));

  if target_user_id is null then
    raise exception 'No account found for %. They need to sign up first.', editor_email;
  end if;

  insert into public.masjid_editors (user_id, masjid_id)
  values (target_user_id, target_masjid_id)
  on conflict (user_id, masjid_id) do nothing;
end;
$$;

create or replace function public.list_masjid_editors(target_masjid_id uuid)
returns table (user_id uuid, email text, created_at timestamptz)
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can list editors';
  end if;

  return query
    select e.user_id, u.email::text, e.created_at
    from public.masjid_editors e
    join auth.users u on u.id = e.user_id
    where e.masjid_id = target_masjid_id
    order by e.created_at;
end;
$$;

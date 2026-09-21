-- Find Jummah Near Me — remove a confirmation vote created while verifying
-- the 0004 grants fix against the live project (not a real user signal).
delete from public.masjid_confirmations
where masjid_id = (select id from public.masjids where slug = 'al-furqan-jame-mosque')
  and created_at > now() - interval '1 hour';

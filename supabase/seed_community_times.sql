-- Find Jummah Near Me — first community-time pass
-- Sourced 23 September 2026 by reading each masjid's own website.
-- Run AFTER 0010_community_times.sql.
--
-- Every row below is source 'community' with last_verified_at null, so the
-- app labels it "Community time · not yet confirmed" and visitors can confirm
-- or dispute it. Nothing here has been confirmed by phone.
--
-- Of the 24 masjids in the directory that publish a website, these 8 publish
-- their Jummah times. The other 16 either don't list them, have a dead domain,
-- or hide them behind a widget or PDF — they stay on the admin checklist.
--
-- Masjid ids are looked up by slug, so this is safe to re-run.

insert into public.jummah_times
  (masjid_id, khutbah_number, khutbah_time, iqamah_time, language, notes, source)
values
  -- Masjid Malcolm Shabazz — seasonal. Site lists 12:00 PM fall/winter and
  -- 1:00 PM spring/summer; 1:00 PM applies until the clocks change (Nov 1).
  ((select id from public.masjids where slug = 'masjid-malcolm-shabazz'),
   1, '13:00:00', null, 'English',
   'From themasjidmalcolmshabazz.com, Sept 2026. Summer schedule — site lists 12:00 PM for fall/winter. Unconfirmed.',
   'community'),

  -- Islamic Cultural Center of New York
  ((select id from public.masjids where slug = 'islamic-cultural-center-of-new-york'),
   1, '13:30:00', null, 'English',
   'From icc-ny.us, Sept 2026. Unconfirmed.', 'community'),

  -- Masjid Ar-Rahman — three khutbahs, each with its own salah time, so the
  -- khutbah/iqamah pairing here is the masjid's own.
  ((select id from public.masjids where slug = 'masjid-ar-rahman'),
   1, '12:35:00', '13:00:00', 'English',
   'From masjidarrahmannyc.org, Sept 2026. Unconfirmed.', 'community'),
  ((select id from public.masjids where slug = 'masjid-ar-rahman'),
   2, '13:20:00', '13:45:00', 'English',
   'From masjidarrahmannyc.org, Sept 2026. Unconfirmed.', 'community'),
  ((select id from public.masjids where slug = 'masjid-ar-rahman'),
   3, '14:05:00', '14:30:00', 'English',
   'From masjidarrahmannyc.org, Sept 2026. Unconfirmed.', 'community'),

  -- Assafa Islamic Center — three khutbahs
  ((select id from public.masjids where slug = 'assafa-islamic-center'),
   1, '13:30:00', null, 'English',
   'From assafaislamiccenter.org, Sept 2026. Unconfirmed.', 'community'),
  ((select id from public.masjids where slug = 'assafa-islamic-center'),
   2, '14:15:00', null, 'English',
   'From assafaislamiccenter.org, Sept 2026. Unconfirmed.', 'community'),
  ((select id from public.masjids where slug = 'assafa-islamic-center'),
   3, '15:00:00', null, 'English',
   'From assafaislamiccenter.org, Sept 2026. Unconfirmed.', 'community'),

  -- Hazrat Abu Bakr Siddique — two khutbahs, different languages
  ((select id from public.masjids where slug = 'hazrat-abu-bakr-siddique'),
   1, '12:45:00', null, 'English',
   'From masjid-abubakr.org, Sept 2026. Unconfirmed.', 'community'),
  ((select id from public.masjids where slug = 'hazrat-abu-bakr-siddique'),
   2, '13:15:00', null, 'Arabic',
   'From masjid-abubakr.org, Sept 2026. Unconfirmed.', 'community'),

  -- Al-Furqan Jame Mosque — site lists a third khutbah but repeats 2:30,
  -- so only the two unambiguous ones are loaded here.
  ((select id from public.masjids where slug = 'al-furqan-jame-mosque'),
   1, '13:30:00', null, 'English',
   'From alfurqanmasjid.org, Sept 2026. Site may list a third khutbah — worth checking. Unconfirmed.',
   'community'),
  ((select id from public.masjids where slug = 'al-furqan-jame-mosque'),
   2, '14:30:00', null, 'English',
   'From alfurqanmasjid.org, Sept 2026. Unconfirmed.', 'community'),

  -- Sunnyside Muslim Center — site also shows 2:15, which is too far after
  -- 1:10 to be that khutbah's iqamah. Likely a second jummah; left out until
  -- someone checks, rather than guessed at.
  ((select id from public.masjids where slug = 'sunnyside-muslim-center'),
   1, '13:10:00', null, 'English',
   'From smcmosque.com, Sept 2026. Site also shows 2:15 — possibly a second jummah, unconfirmed.',
   'community'),

  -- Madani Mosque — seasonal. 1:30 PM summer, 1:15 PM winter.
  ((select id from public.masjids where slug = 'madani-mosque'),
   1, '13:30:00', null, 'English',
   'From madanimasjidnyc.org, Sept 2026. Summer schedule — site lists 1:15 PM for winter. Unconfirmed.',
   'community')
on conflict (masjid_id, khutbah_number) do nothing;

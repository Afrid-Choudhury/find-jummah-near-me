-- Find Jummah Near Me — coordinates and the raw link on masjid suggestions
-- Run after 0008_masjid_suggestions.sql
--
-- 0008 deliberately had no coordinates, on the reasoning that submitters don't
-- know them. `src/lib/mapLinks.ts` changed that: someone can paste a Google
-- Maps link and we can read the pin out of it.
--
-- All three columns are nullable — a submission with no link is still a
-- perfectly good submission, and the point of the queue is that an admin
-- fills in whatever is missing.

alter table public.masjid_suggestions
  add column latitude double precision,
  add column longitude double precision,
  -- The raw pasted string, kept whether or not it parsed. Short links
  -- (maps.app.goo.gl) can't be resolved in the browser, so storing the text
  -- lets an admin just open the place at approval instead of the submission
  -- being refused for carrying a link we couldn't read.
  add column map_link text;

-- Deliberately no CHECK on the coordinates here, unlike `masjids`. This is
-- unverified public input: rejecting the insert would throw away the entire
-- submission over one bad number. parseMapLink already refuses out-of-area
-- pairs client-side, and the real constraint still applies on `masjids` when
-- an admin approves.

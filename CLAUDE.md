# Find Jummah Near Me — working notes for Claude

NYC masjid directory answering one question: **"Where is the best nearby
masjid for me to attend Jummah right now?"** React 18 + Vite + TypeScript
(strict) + Tailwind on Supabase. Mobile-first; most users open this on a
phone, on the street, on a Friday.

Read `BUILD_GUIDE.md` for the full phase-by-phase design rationale.

## Architecture rules — do not break these

1. **Components never talk to Supabase.** Pages call hooks, hooks call
   `src/services/*`, and only services import the client. A new capability
   is a new service file, not a rewrite.
2. **The UI consumes domain types, not database rows.** Row → domain mapping
   happens once, in `src/types/index.ts`. A schema change should touch two
   files, not twenty.
3. **Time logic is pure.** Everything in `src/lib/jummah.ts` is a function of
   `(data, now)` — no `Date.now()` inside. That is what makes countdowns and
   the recommendation engine testable, and why components take `now` as a
   prop or read the `useNow` hook.
4. **Users signal, admins write.** Community input is append-only
   (`masjid_confirmations`, `masjid_reports`, `time_suggestions`). Official
   data changes only through the admin dashboard, enforced by RLS — not by
   hidden UI. RLS is the real security boundary.
5. **Design tokens, never hex codes.** All colors live in
   `tailwind.config.ts`. Saffron is reserved for the things people act on:
   Jummah times, countdowns, Directions buttons.

## Accuracy is the product

Never invent a Jummah time, and never hard-code one — not in seed files, not
in `src/data/mockMasjids.ts` (its empty schedules are deliberate). Times are
entered and verified through `/admin`, which stamps `last_verified_at`.
Anything derived rather than listed by a masjid must be labelled an estimate
in the UI (see the `~` times and footnote in `KhutbahTiming.tsx`).

## Gotchas already paid for

- `src/types/database.ts` is hand-written. **Every table and view needs a
  `Relationships: []` field.** Without it, supabase-js v2 resolves
  `.from(x).insert()` to `never[]` and typechecking fails in a way that
  points nowhere near the cause.
- `tsconfig` uses `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
  Indexed access returns `T | undefined`; optional props reject explicit
  `undefined`.
- `npm run build` runs `tsc -b`, which typechecks `vite.config.ts` too — that
  is why `@types/node` is a devDependency.
- Verify any change with `npm run typecheck` and `npm run build` before
  calling it done.

## Data

- `supabase/migrations/0001_initial_schema.sql`, `0002_confidence_and_admin.sql`,
  `0003_accounts_and_suggestions.sql` — run in order.
- `supabase/seed.sql` — 38 masjids (Manhattan, Queens), with phone/website.
- `supabase/seed_batch2.sql` — 166 more (Manhattan, Queens, Brooklyn),
  sourced from Google Places, deduplicated by coordinate proximity (<60m).
  Phone/website deliberately `NULL`; fill them in via the admin dashboard
  while verifying. One Ahmadiyya-affiliated listing is flagged in a comment
  at the top of that file with a one-line `delete` if it should come out.
- Total after both: **204 masjids**. `slug` is unique and is how the app
  routes; `borough` and NYC lat/lng bounds are CHECK-constrained.
- The Bronx and Staten Island have **not** been sourced yet.

## Where things stand (September 2026 — prune this section once it is stale)

- Zero `jummah_times` rows exist. Every masjid renders the "No khutbah time
  listed yet" empty state. Entering real, verified times is the main
  remaining work, and `/admin` already sorts masjids with no times first.
- Latest feature: the **Khutbah timing** section on the masjid detail page
  (`src/components/masjid/KhutbahTiming.tsx` + `buildKhutbahTimeline` in
  `src/lib/jummah.ts`) — khutbah begins → iqamah → estimated end, with a
  live status badge on Fridays. Typechecks and builds clean.
- Not yet done: git repo + GitHub, Supabase migrations applied to the live
  project, `.env.local`, Vercel deploy, Supabase Auth redirect URLs for the
  production domain, and the one-time `admin_users` insert.
- `vercel.json` (SPA rewrite) and `public/_redirects` are already in place.
- `VITE_`-prefixed env vars are baked in at **build** time — they must exist
  in the host's environment before the first production build, or the site
  ships with mock data.

# Find Jummah Near Me — Step-by-Step Build Guide

A phased plan mapped directly to the product vision. The entire app answers one question — **"Where is the best nearby masjid for me to attend Jummah right now?"** — so every phase is judged against the seven-step success journey: open → share location → see nearby masjids → see accurate schedules → get a recommendation → tap Directions → trust the data.

Phases 0–5 are implemented in this repository. Phases 6–7 are the remaining launch work.

---

## Architecture principles

1. **Components never talk to Supabase.** Pages call hooks, hooks call `src/services/*` (masjid, feedback, admin), and only services import the client. New capabilities are new service files, not rewrites.
2. **The UI consumes domain types, not database rows.** Mapping happens once in the service layer (`src/types/index.ts` mappers). Schema changes touch two files.
3. **Time logic is pure.** Everything in `src/lib/jummah.ts` is a function of `(data, now)` — no hidden clocks — so the recommendation engine and countdowns are unit-testable and tick correctly via the `useNow` hook.
4. **Users signal, admins write.** Community input is append-only (`masjid_confirmations` / `masjid_reports`); all official data flows through the admin dashboard, enforced server-side by RLS, not just hidden UI.
5. **Design tokens, not hex codes** (`tailwind.config.ts`). Saffron is reserved for the things Friday users act on: Jummah times, countdowns, Directions.

```
src/
├── components/
│   ├── ui/            # Button, Card, Badge, Skeleton
│   ├── layout/        # AppShell, Header
│   ├── masjid/        # MasjidCard, MasjidList, RecommendationCard,
│   │                  # DirectionsButton, ConfidenceMeta, ConfidenceVote,
│   │                  # JummahTimeBadge
│   ├── map/           # MasjidMap (desktop map pane; simplified plot for now)
│   └── search/        # SearchBar
├── data/              # Mock fixtures (dev fallback, no backend needed)
├── features/
│   ├── auth/          # AuthProvider (used by admin only — no user accounts)
│   └── admin/         # AdminGuard, dashboard, masjid form + times editor
├── hooks/             # useMasjids, useGeolocation, useNow, useDebounce
├── lib/               # supabase, utils, constants, jummah (time engine), directions
├── pages/             # HomePage, MasjidDetailPage, NotFoundPage
├── routes/            # Router with code-split detail + admin chunks
├── services/          # masjidService, feedbackService, adminService
└── types/             # Domain types + DB row types
```

---

## Phase 0 — Scaffolding & tooling ✅

Vite + React 18 + strict TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Tailwind, path alias `@ → src`, `build` runs `tsc -b` so type errors fail CI. `.env.example` documents the two Supabase vars; the app runs fully on mock data without them.

## Phase 1 — Design system ✅ (mobile-first requirements)

Tokens in `tailwind.config.ts`; Fraunces display + Inter UI type, large by default. The vision's mobile checklist is built into the primitives, not sprinkled per-page:

- **Large touch targets:** every button/anchor is ≥ 44px tall (`h-11`).
- **One-handed use:** single column, `max-w-app`, primary actions full-width near the bottom of each card.
- **Sticky search bar** under the sticky header.
- **Accessible contrast:** night-on-paper and saffron-deep-on-soft pairs pass WCAG AA; `:focus-visible` rings; `prefers-reduced-motion` respected.
- **Fast on mobile networks:** two font families, no component library, admin + detail code-split out of the first load.

## Phase 2 — Data model ✅

`supabase/migrations/0001_initial_schema.sql` + `0002_confidence_and_admin.sql` implement exactly the five vision entities:

| Entity | Table(s) | Notes |
| --- | --- | --- |
| Masjids | `masjids` | CHECK constraints on borough + NYC coordinates |
| Jummah Times | `jummah_times` | Multiple khutbahs per masjid; `last_verified_at` stamp |
| Community Confirmations | `masjid_confirmations` | Append-only, anonymous insert allowed by RLS |
| Community Reports | `masjid_reports` | Same; counts exposed via `masjid_confidence` view |
| Admin Users | `admin_users` | Checked by a `security definer` `is_admin()` function |

RLS is the real security boundary: public read on directory data, insert-only on confidence tables, and **write policies on `masjids`/`jummah_times` that require `is_admin()`** — a modified client cannot alter official data. (`favorites` from 0001 remains but is unused; user accounts are a delayed feature.)

## Phase 3 — Core browsing experience ✅

- **Location-based search:** tap-to-share location with one clear card explaining the benefit, haversine distance, list sorted nearest-first. Denied/unavailable states point to the search bar as the fallback.
- **Masjid cards** show everything the vision lists: name, distance, address, today's time(s), countdown to the next Jummah ("Jummah in 42 min" / "Friday 1:15 PM"), last verified date, and 👍/👎 counts.
- **Sticky, debounced search** across name / neighborhood / borough / address.
- **Detail page** adds iqamah times, per-schedule verification dates, notes, language, tap-to-call, website, amenities.

## Phase 4 — Recommendation engine + one-tap directions ✅

**Recommendation** (`src/lib/jummah.ts → recommendBestJummah`): on Fridays with location on, every remaining khutbah today is scored — travel is estimated (walking ≤ 1.25 mi at 3 mph, otherwise city driving at 12 mph + 8 min parking overhead), unreachable ones are dropped, and the earliest reachable start wins (ties → shortest travel). If the nearest khutbah already started, a later or second khutbah naturally becomes the answer to "which Jummah can I still make?" The card shows time, travel, **leave within X min**, estimated arrival, and a reassurance line.

Tuning knobs are named constants at the top of the file (`WALK_MPH`, `WALK_MAX_MILES`, `DRIVE_MPH`, `DRIVE_OVERHEAD_MIN`). A future upgrade is swapping `estimateTravel` for a routing API (Google Distance Matrix / OSRM) — it's one function behind a stable signature.

**Directions** (`src/lib/directions.ts`): Apple Maps on iOS, Google Maps elsewhere, destination pre-filled with exact coordinates. The button appears full-size on the recommendation, every card, and the detail header — it is deliberately *not* inside a card-wide link, so it's always exactly one tap.

## Phase 5 — Community confidence + admin dashboard ✅

**Confidence:** users vote 👍 "Looks right" / 👎 "Report an issue" on the detail page. Votes are anonymous inserts; a localStorage marker prevents casual double-voting (server-side rate limiting is a hardening item). Counts render on every listing next to the verification date.

**Admin** (`/admin`, code-split):
- Magic-link sign-in (no passwords), gated by `AdminGuard`: Supabase configured → signed in → `is_admin()`.
- Dashboard lists all masjids sorted by *needs-review first* (most reports, then oldest verification) with confidence counts inline.
- Create/edit form covers every field; the Jummah times editor adds/edits/removes schedules and has a one-tap **"Mark verified today"** per schedule.
- Deleting a masjid cascades to its times (FK `on delete cascade`).

**To become an admin:** sign in once at `/admin` (creates your `auth.users` row), then run
`insert into public.admin_users (user_id) values ('<your-user-id>');` in the SQL editor. One-time step; after that you never touch the database manually.

## Phase 5b — Accounts, suggestions & review tooling ✅

Added after launch planning, without breaking the ownership rule:

- **Accounts** (`/login`, `/account`): email + password via Supabase Auth. Admins use the same login; admin status is still the `admin_users` row.
- **Time suggestions**: signed-in users propose a schedule from any masjid page. Suggestions live in `time_suggestions` (RLS: users see their own, admins see all) and never touch `jummah_times` until approved.
- **Admin review queue** (`/admin/suggestions`): suggestion shown side-by-side with what's currently listed; "Approve" upserts the schedule and stamps it verified in one tap.
- **Data-entry checklist**: the admin home lists masjids with no times first, with a Call button (tel: link) and "Add times" inline.
- **Inline editing**: every listed time can be edited in place; saving an edit also stamps it verified.
- **Report resolution**: "Mark reviewed" stamps `masjids.last_reviewed_at`; the confidence view only counts signals after that moment, so a fixed listing isn't haunted by old 👎s. Signals are kept for history.

## Phase 6 — Data accuracy & launch prep (next)

Accuracy is the product. Before real users:

1. Replace seed data with schedules you have personally verified; stamp each via "Mark verified today". The seed/mock data in this repo is **illustrative only**.
2. Build a review habit: open `/admin` weekly — the sort order already surfaces listings with reports or stale verification.
3. Error boundary at the shell + Sentry; Lighthouse pass targeting LCP < 2.5s on 4G.
4. SEO basics: per-masjid titles/meta, sitemap, OG tags.
5. Deploy (Vercel/Netlify): two env vars + SPA rewrite (`/* → /index.html`). Set the Supabase Auth redirect URL to your production `/admin`.
6. CI: GitHub Action running `typecheck` + `build` on every PR.

**Estimated effort:** 2–3 days (mostly data verification).

## Phase 7 — Post-launch improvements

- Real travel times via a routing API behind `estimateTravel`.
- Server-side vote rate limiting (per-IP via an Edge Function) if abuse appears.
- Admin niceties: a "resolve reports" action that clears counters after review (add a `resolved_at` column rather than deleting signals).
- Street map — `MasjidMap` (the desktop map pane beside the list) is a simplified pin plot with the props contract the Leaflet version will keep; swap its internals, not `HomePage`.

## Delayed features (per the vision — do not build yet)

Daily prayer times · notifications · events · chat/social · Ramadan schedules · PWA · advanced animations. (User accounts were pulled forward in Phase 5b, scoped strictly to suggestions.) The architecture already has seams for each (feature folders, service layer, `favorites` table), so none require refactoring when their time comes.

---

## Running the project

```bash
npm install
npm run dev          # mock data — full UX testable without a backend
# live data:
cp .env.example .env.local   # add Supabase URL + anon key, run both migrations
```

Tip for testing the recommendation engine on a non-Friday: temporarily change your system clock, or in dev pass a fixed Friday date into `recommendBestJummah` from `HomePage`.

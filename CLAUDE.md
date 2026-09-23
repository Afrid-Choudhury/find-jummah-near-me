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
4. **Tiered trust: the label must match the evidence.** Data carries its own
   provenance and the UI is obliged to show it. Three tiers write
   `jummah_times`, all still through RLS — only `is_admin()` or an approved
   `masjid_editors` grant can write the table, so the tier is a property of
   the *row*, not a loophole in who may insert:
   - **Verified** — `source 'admin'` with `last_verified_at` set. An admin
     personally confirmed it. Only this tier gets saffron and a "Verified
     <date>" stamp.
   - **Community** — `source 'community'`, `last_verified_at` null. Published
     from a suggestion because it looked plausible, *not* because anyone
     checked. Shown with a quieter, dashed treatment, labelled as unverified,
     and carrying its own 👍/👎 controls. Marking one verified promotes it to
     the tier above; that's what `markTimeVerified` is for.
   - **Retracted** — a community time the crowd rejected (`reports >= 2` and
     `reports > confirmations`, see `isTimeRetracted`). Hidden from the public
     site and from the recommendation engine, never deleted: the mapper keeps
     it out of `Masjid.jummahTimes` and puts it in `retractedTimes` for the
     admin to fix or remove. Verified times never auto-hide.

   Everything else is unchanged: community input is still append-only
   (`masjid_confirmations`, `masjid_reports`, `time_suggestions`,
   `masjid_suggestions`), anyone may submit signed in or not, and editors
   (since `0007`) may write only their own masjid and cannot grant access to
   anyone including themselves. **RLS is the real security boundary — not
   hidden UI.** What changed is that "unverified" is now a state the UI can
   show honestly, rather than a reason to show nothing.
5. **Design tokens, never hex codes.** All colors live in
   `tailwind.config.ts`. Saffron is reserved for the things people act on:
   Jummah times, countdowns, Directions buttons.

## Accuracy is the product

Never invent a Jummah time, and never hard-code one — not in seed files, not
in `src/data/mockMasjids.ts` (its empty schedules are deliberate).

Since `0010` this does **not** mean every published time was personally
checked — it means **the UI's confidence must match the data's confidence**.
A community time may be public, but never dressed as verified: no saffron, no
"Verified" stamp, and the recommendation card must say so rather than let
"leave within 4 minutes" imply certainty. `last_verified_at` keeps its narrow
meaning — an admin confirmed this themselves — and nothing sets it
automatically, which is why approving a suggested time prefills a draft for
the admin to commit instead of writing the row for them.

Anything derived rather than listed by a masjid must be labelled an estimate
in the UI (see the `~` times and footnote in `KhutbahTiming.tsx`).

## Gotchas already paid for

- `src/types/database.ts` is hand-written. **Every table and view needs a
  `Relationships: []` field.** Without it, supabase-js v2 resolves
  `.from(x).insert()` to `never[]` and typechecking fails in a way that
  points nowhere near the cause. **Any schema change (new/changed/removed
  table, view, or column) must be reflected here by hand** — there's no
  codegen step wired up yet (see the file's own header comment for the
  `supabase gen types` command that would replace it).
- `tsconfig` uses `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
  Indexed access returns `T | undefined`; optional props reject explicit
  `undefined`.
- `npm run build` runs `tsc -b`, which typechecks `vite.config.ts` too — that
  is why `@types/node` is a devDependency. If `node_modules` is ever out of
  sync with `package.json` (e.g. after a fresh clone or a merge), this fails
  with `Cannot find module 'node:path'` / `Cannot find name '__dirname'`
  pointing at `vite.config.ts`, which has nothing to do with the real cause
  — run `npm install` first.
- **Verify every change with `npm run typecheck` and `npm run build` before
  calling it done.**
- Supabase's current Postgres 17 project template does **not** carry the
  `uuid-ossp` extension on the default search path, and does **not**
  auto-grant `anon`/`authenticated` table access the way older templates
  did. Two real bugs this cost us, both fixed in migrations against the
  live project (`FindjumahMVP`):
  - `uuid_generate_v4()` failed on every insert until switched to
    `gen_random_uuid()` (core Postgres since v13, no extension needed).
  - Every RLS policy was correct but every anon read/write still failed
    with "permission denied for table X" until explicit `grant` statements
    were added (`0004_grants.sql`) — RLS restricts rows, it doesn't grant
    table-level access; both are required.
  Any new table needs its own `grant select ...` (and `insert`/`update`/
  `delete` as appropriate) to `anon`/`authenticated`, mirroring its RLS
  policies — it will not work by default.
- `supabase config push` pushes the **whole** local `config.toml`, not just
  what you changed. The `supabase init` template's Auth/db defaults (email
  confirmation off, MFA enrollment off, 6-digit OTP, tiny connection pool)
  differ from what's actually configured on the live project — run
  `supabase config diff` and read it before ever running `config push`, or
  use a scoped Management API `PATCH` (e.g. `/v1/projects/{ref}/config/auth`)
  for a single field like `site_url`.
- **Vercel blocks deployments whose git commit author isn't a Vercel user
  with project access**, and on Hobby + a private repo it can't grant that
  access. Symptom: deployments sit at `Building…` forever, `vercel ls` shows
  `UNKNOWN` with no duration, and `vercel logs` returns nothing at all —
  because the build never starts. There are **two identities to keep
  straight**, and they broke independently here:
  - *Manual `vercel --prod`* authenticates as the Vercel user. Fixed by
    adding the commit-author address as a verified second email on the
    Vercel account.
  - *Git-triggered deploys* resolve commit email → GitHub account → Vercel
    account. `afridcho123@gmail.com` belongs to GitHub account
    `afridchoudhury`, but the repo and Vercel connection belong to
    **`Afrid-Choudhury`** — a different account — so those stayed blocked
    even after the Vercel email was verified. Fixed by setting the repo's
    commit email to `158215355+Afrid-Choudhury@users.noreply.github.com`,
    which always attributes to the right account.
  `gh api repos/<owner>/<repo>/commits/<sha> --jq .author.login` shows which
  GitHub account a commit actually attributes to — check that first.
  Auto-deploy on push is confirmed working since that fix (first green
  git-triggered build: `81ed83b`).
- **Verify a deploy by its content, not its status code.** The production
  alias silently stayed on an old deployment for hours while every check
  returned a healthy `200`. Confirm something only the new build has (a new
  route, new nav) actually renders, or check `vercel alias ls` to see which
  deployment the domain currently points at.
- `npm run lint` has no ESLint config in this repo (only the script and
  deps exist) — CI intentionally runs `typecheck` + `build` only, per
  `BUILD_GUIDE.md`'s Phase 6 spec. Setting up ESLint is unstarted work, not
  a regression.

## Data

- `supabase/migrations/0001_initial_schema.sql` through
  `0008_masjid_suggestions.sql` — run in order. `0004_grants.sql` is the
  anon/authenticated table grants fix (see Gotchas); `0005` is a one-off
  cleanup, not a schema change; `0006` opens `time_suggestions` to anonymous
  submissions; `0007` adds `masjid_editors` (see architecture rule 4);
  `0008` adds `masjid_suggestions` for masjids not in the directory yet;
  `0009` gives it nullable `latitude`/`longitude`/`map_link`; `0010` adds
  `jummah_times.source`, per-schedule votes (`jummah_time_id` on both vote
  tables) and the `jummah_time_confidence` view — see architecture rule 4.
- `0010` also **narrowed `masjid_confidence`** to `jummah_time_id is null`.
  Without that, a vote on one schedule would also inflate the listing's
  counters and be counted twice.
- The two suggestion tables cover different halves and shouldn't be confused:
  `time_suggestions` is a schedule for a masjid **already listed**;
  `masjid_suggestions` is a masjid we **don't list at all**. The latter
  deliberately has no lat/lng — submitters don't know them, and the NYC bounds
  CHECK on `masjids` would reject a guess, so an admin geocodes at approval.
- `supabase/seed.sql` — 38 masjids (Manhattan, Queens), with phone/website.
- `supabase/seed_batch2.sql` — 166 more (Manhattan, Queens, Brooklyn),
  sourced from Google Places, deduplicated by coordinate proximity (<60m).
  Phone/website deliberately `NULL`; fill them in via the admin dashboard
  while verifying. One Ahmadiyya-affiliated listing (Masjid Bait Ul Tahir)
  was kept in per an explicit decision — it's a real listing from the
  Google Places sweep, not an oversight.
- Total after both: **204 masjids**. `slug` is unique and is how the app
  routes; `borough` and NYC lat/lng bounds are CHECK-constrained.
- The Bronx and Staten Island have **not** been sourced yet.
- Both migrations and both seed files are **applied to the live Supabase
  project** (`FindjumahMVP`, ref `lwibigaehrckiowzrhnj`, `ca-central-1`).
  `supabase/config.toml` links this repo to it — `supabase db push` /
  `supabase migration list` talk to the real project, not a local stack.

## Where things stand (September 2026 — prune this section once it is stale)

- **Live in production:** https://find-jummah-near-me.vercel.app (Vercel
  project `find-jummah/find-jummah-near-me`), auto-deploying on push to
  `main` via a GitHub App connection (had to be granted at the **Team**
  level — `FindJummah` — not the personal account; a personal "Login
  Connection" alone isn't enough for the git integration). Custom domain
  `findjummahnearme.com` is planned but not yet connected; it's already
  pre-registered in Supabase's Auth redirect allow-list so it'll work the
  moment DNS points at Vercel.
- **Supabase is live**, not just migrated locally: `FindjumahMVP` project,
  204 masjids seeded, RLS + grants verified end-to-end (anon read of the
  masjid list and an anon confirmation vote round-tripping through the
  `masjid_confidence` view were both tested against production).
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are set in `.env.local`
  (gitignored) and in all three Vercel environments (production/preview/
  development). `VITE_`-prefixed env vars are baked in at **build** time —
  they must exist before the build runs, or the site ships with mock data.
- Supabase Auth `site_url` / redirect allow-list point at the Vercel URL +
  localhost + the planned custom domain.
- `admin_users` has one row: `afridchoudhury.job@gmail.com`. `/admin` is
  reachable and gated correctly (verified `AdminGuard` redirects signed-out
  visitors to `/login`).
- CI (`.github/workflows/ci.yml`) runs `typecheck` + `build` on every PR
  and push to `main`, green as of the last push.
- **Three** `jummah_times` rows exist as of 2026-09-22 (Baitul Ateeq, Masjid
  Hanafia, Woodside Baitul Jannah) — all `source 'admin'` and verified, all
  entered by hand through `/admin`. 201 masjids still show the empty state,
  so entering times remains the main work; `/admin` sorts masjids with no
  times first. `0010` exists precisely to make that backlog tractable:
  plausible suggestions can now go live labelled unverified instead of
  waiting on a phone call.
- Latest feature: **tiered community trust** (`0010`). `/admin/suggestions`
  now offers two publish paths, deliberately styled so they can't be
  conflated: "Verify & publish" (saffron, stamps `last_verified_at`, says you
  checked it) and "Publish as community time" (dashed, `source 'community'`,
  `last_verified_at` null). Public schedules render in three states —
  verified / community-confirmed / community-unconfirmed — with per-schedule
  👍/👎 on the community ones. Two or more reports outweighing confirmations
  retracts a time: hidden from the site and from `recommendBestJummah`, kept
  in the database and surfaced at the top of the admin dashboard and in the
  masjid's times editor. Verified end-to-end against the live project,
  including that a retracted row persists rather than being deleted.
  `RecommendationCard` states when its pick rests on an unverified time and
  offers the masjid's phone number.
- Before that: **suggest a missing masjid** (`0008`), with its admin
  side. `/suggest-masjid` is reachable from the no-results empty state and a
  quiet link under the masjid list; typing a name surfaces close matches
  first, since most "missing" masjids are already listed under a different
  spelling. `/admin/suggestions` has a second section for them, flagging
  possible duplicates by name/address word overlap, and the admin dashboard
  card shows both queue counts.
  **Approval deliberately isn't an insert.** `masjids` requires latitude and
  longitude under CHECK constraints and a suggestion carries neither, so
  "Approve" links to `/admin/new?from_suggestion=<id>`, which prefills the
  form and closes the suggestion when that form saves. The suggested Jummah
  time and notes can't live on `masjids`, so the form surfaces them as a
  reminder to add the time after creating — don't drop them silently.
  Both forms take a pasted Maps link to fill coordinates
  (`src/lib/mapLinks.ts`, pure). It prefers `!3d/!4d` (the place itself) over
  `@` (the map's centre, which isn't always the pin), then a `q`/`query`/`ll`
  parameter, then a bare pair, and validates against the same NYC bounds the
  database CHECKs. Short links can't be followed from the browser and are
  never fetched — but since `0009` the **raw pasted string is stored either
  way** in `map_link`, so an unreadable link reaches the reviewer as something
  they can click instead of being refused.
  `masjid_suggestions.latitude/longitude` carry **no** CHECK, unlike
  `masjids`: this is unverified public input, and rejecting the insert would
  throw away a whole submission over one bad number. The real constraint still
  applies at approval.
  Anywhere a submitted `map_link` is rendered it goes through a protocol guard
  — it's attacker-controlled text, and `javascript:` in an `href` would run on
  the admin's click.
- Before that: **masjid editors** (`0007`). An admin can grant a signed-up
  user editor access to one masjid from that masjid's admin page; the editor
  then writes its `jummah_times` directly. No editor-facing UI exists yet —
  the permission model is in place, but an editor currently has no screen of
  their own to use it, so that's the natural next piece. Verified against the
  live project with seven rolled-back `set local role authenticated` tests
  covering both directions (editor can write their own masjid; cannot write
  another's, cannot self-grant, cannot re-point a row to another masjid via
  update, and a plain signed-in user still cannot write at all).
- Before that: **anonymous time suggestions.** `SuggestTimeForm` no
  longer gates on sign-in — logged-out visitors get the same form plus an
  optional "name or email" field, submitted via `time_suggestions` with
  `user_id = null`. The `0006_open_suggestions.sql` migration's `with check
  (user_id is null and status = 'pending')` makes it impossible for an
  anonymous insert to land pre-approved or attributed to someone else's
  account — verified directly against the live project with `set local
  role anon` (both a spoofed `status = 'approved'` and a spoofed `user_id`
  were rejected by RLS). The admin review queue is otherwise unchanged:
  nothing reaches `jummah_times` without approval.
- Before that: Phase 6 basics (shell-level `ErrorBoundary`, per-masjid
  `<title>`/meta via `useDocumentMeta`, OG/Twitter tags, `robots.txt`, and
  an auto-generated `sitemap.xml` that includes every masjid once Supabase
  env vars are present), and the **Khutbah timing** section on the masjid
  detail page (`src/components/masjid/KhutbahTiming.tsx` +
  `buildKhutbahTimeline` in `src/lib/jummah.ts`).
- `vercel.json` (SPA rewrite) and `public/_redirects` are in place and
  confirmed working (deep-linking straight to `/masjid/:slug` on the
  production URL renders correctly, not a 404).
- Not yet done: Sentry, a Lighthouse pass, an ESLint config (see Gotchas),
  and of course the real verified Jummah times themselves.

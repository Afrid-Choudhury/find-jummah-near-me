# Find Jummah Near Me

**"Where is the best nearby masjid for me to attend Jummah right now?"**

Live at **[findjummahnearme.com](https://findjummahnearme.com)**

A mobile-first directory of NYC masjids built for one moment: it's Friday, you're
somewhere unfamiliar, and you need to know where you can still make Jummah. Share your
location and it sorts masjids by distance, works out which khutbah you can still reach
on foot or by car, and gives you one tap to directions.

- **204 masjids** across Queens (108), Brooklyn (70) and Manhattan (26). The Bronx and
  Staten Island aren't covered yet.
- **Best-khutbah recommendation:** on a Friday, picks the earliest khutbah you can still
  arrive for, given distance and an estimated walking or driving time.
- **Honest times.** Every time shows where it came from and how much to trust it (see
  below). Times are never invented or hard-coded.

## How trust works

Jummah times are only useful if they're right, but no one person can phone 200 masjids.
So times are published in tiers, and the interface always shows which tier a time is in:

| Tier | What it means | How it looks |
| --- | --- | --- |
| **Verified** | An admin confirmed it with the masjid | Gold, with a "Verified <date>" stamp |
| **Community** | Submitted by a visitor or read off the masjid's website; published, but not checked by us | Neutral, dashed, labelled "not yet confirmed", with 👍 / 👎 buttons |
| **Taken down** | A community time that two or more people disputed, outnumbering confirmations | Hidden from the site and the recommendation engine; kept for an admin to fix |

Anyone can suggest a time or a missing masjid without an account. Nothing they submit
goes live until an admin publishes it, either as verified or as a community time. Those
rules are enforced in the database with Postgres row-level security, not just hidden in
the UI.

## Tech

- **Frontend:** React 18, TypeScript (strict), Vite, Tailwind, TanStack Query, React Router
- **Backend:** Supabase (Postgres, row-level security, email and password auth)
- **Hosting:** Vercel, deploying automatically on every push to `main`; CI runs
  typecheck and build on every push and PR
- **Search:** every masjid page is pre-rendered at build time with its own title,
  description, canonical URL and times as plain HTML, so search engines don't have to
  run JavaScript. An auto-generated `sitemap.xml` lists every masjid.

## How it's put together

- **Pages → hooks → services → Supabase.** Only `src/services/` talks to the database.
- **Database rows → domain types happens once**, in `src/types/index.ts`; the UI never
  sees raw rows.
- **Time logic is pure.** `src/lib/jummah.ts` (next occurrence, countdowns, travel
  estimates, the recommendation) is a function of `(data, now)` with no hidden clock, so
  it can be tested against any date.
- **Design tokens only** (`tailwind.config.ts`). Gold is reserved for verified times,
  countdowns and the Directions button.

`CLAUDE.md` holds the working notes and the decisions behind them; `BUILD_GUIDE.md`
holds the original phased plan.

## Built with AI assistance

This project was built with [Claude Code](https://claude.com/claude-code), which wrote
most of the code and the SQL migrations. The product decisions (what to build, the trust
model, what goes live and how it's labelled) and the review of every change were mine,
along with sourcing and entering the data. A change wasn't considered done until it
passed `npm run typecheck` and `npm run build`. Database permission changes were tested
against the live project, and deploys were checked against the live site's content.

## Running it locally

```bash
npm install
npm run dev
```

Without Supabase credentials the app runs on **mock data** (real masjid locations, no
times). To use a real backend:

1. Create a Supabase project.
2. Run `supabase/migrations/` in order (`0001` → `0010`), then `supabase/seed.sql` and
   `supabase/seed_batch2.sql` (locations only, no times).
3. `cp .env.example .env.local` and add your project URL and anon key.
4. Restart the dev server.

**Becoming an admin:** create an account at `/login`, then in the Supabase SQL editor:

```sql
insert into public.admin_users (user_id) values ('<your user id from Authentication>');
```

After that, all data management happens in `/admin`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm run build` | Type-check, production build to `dist/`, then pre-render masjid pages |
| `npm run prerender` | Pre-render step on its own (skips without Supabase credentials) |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` |

## What's next

- Summer and winter Jummah times that switch automatically when the clocks change (in
  progress)
- A screen for masjid editors to keep their own masjid's times current (the database
  permissions already exist)
- The Bronx and Staten Island

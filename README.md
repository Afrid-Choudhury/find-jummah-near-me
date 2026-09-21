# Find Jummah Near Me

**"Where is the best nearby masjid for me to attend Jummah right now?"**

A mobile-first web app that answers that one question: nearby masjids sorted by distance, accurate Jummah times with verification dates and community confidence, a recommendation for the best khutbah you can still make, and one-tap directions.

Built with React + Vite + TypeScript + Tailwind + Supabase.

## Quick start

```bash
npm install
npm run dev
```

The app runs on **mock data** out of the box — no backend required. To connect Supabase:

1. Create a project at supabase.com
2. Run the three migrations in `supabase/migrations/` in order, then `supabase/seed.sql` (38 real Manhattan & Queens masjids sourced from Google Maps — locations only, no times)
3. `cp .env.example .env.local` and fill in your project URL + anon key
4. Restart the dev server — it switches to live data automatically

### Becoming the admin

Visit `/admin`, sign in with a magic link once, then in the Supabase SQL editor:

```sql
insert into public.admin_users (user_id) values ('<your user id from Authentication>');
```

From then on all data management happens in the dashboard — never in SQL.

## Scripts

| Command             | What it does                             |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Dev server at http://localhost:5173      |
| `npm run build`     | Type-check + production build to `dist/` |
| `npm run preview`   | Serve the production build locally       |
| `npm run typecheck` | `tsc --noEmit`                           |

## How it's put together

- **Pages → hooks → services → Supabase.** Only `src/services/` touches the client.
- **Pure time engine** in `src/lib/jummah.ts`: next-occurrence math, countdowns, travel estimates, and the recommendation logic — all functions of `(data, now)`.
- **Users signal, admins write.** Anyone can 👍/👎 a listing; signed-in users can *suggest* Jummah times. Nothing reaches the public schedule until an admin approves it in the dashboard — enforced by RLS, not just UI.
- **Design tokens** in `tailwind.config.ts`; saffron is reserved for what Friday users act on.

See **BUILD_GUIDE.md** for the full phased plan and remaining launch work.

## Data accuracy

Accuracy is the most important feature. The seeded masjids (names, addresses, coordinates, phones, websites) come from each masjid's Google Maps listing as of July 2026 — a solid starting point, but still confirm details for any listing you care about. Jummah times are deliberately not seeded: enter each schedule through the admin dashboard after confirming it with the masjid, which stamps the "Last verified" date users rely on.

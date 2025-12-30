# Better Bites Monorepo

This workspace houses the end-to-end implementation for the Better Bites food tracking and fitness platform:

- **better-bites-web/** – Angular front-end with standalone feature areas, Tailwind styling, Supabase integration, and a 3D avatar canvas.
- **supabase/sql/** – SQL migrations defining the primary schema, triggers, and row-level security policies for Supabase (Cosmos organization).

## Prerequisites

- Node.js 20+ and npm
- Python 3.11+
- Supabase CLI (logged in to the Cosmos organization)

## Front-end (Angular)

```bash
cd better-bites-web
npm install
npm start
```

Configure Supabase by setting the following variables (e.g. in `better-bites-web/.env.local`, which stays out of Git):

```
NG_APP_SUPABASE_URL=https://<project-ref>.supabase.co
NG_APP_SUPABASE_ANON_KEY=<anon-key>
```

When you create or link a Supabase project, ensure it lives under the **Cosmos** organization per team policy.

Key feature folders:

```
src/app/
├── core/          # Services, guards, interceptors, DI tokens
├── shared/        # Layouts, reusable components, utilities
├── auth/          # Auth routes and components
├── onboarding/    # Onboarding flow
├── dashboard/     # Main analytics and avatar view
├── tracking/      # Meals, water, activity modules
├── streaks/       # Streak visualization
├── insights/      # Charts, progress summaries
├── admin/         # Admin console
└── settings/      # User preferences and alerts
```

## Supabase schema

Migrations live in `supabase/sql`. Apply the baseline schema using the Supabase CLI:

```bash
supabase db push --file supabase/sql/001_core_schema.sql
supabase db push --file supabase/sql/002_seed_content.sql
supabase db push --file supabase/sql/003_add_logged_at_to_activity_entries.sql
```

The scripts create tables for profiles, logs, streaks, motivational content, cached food references, and audit events. Row-level security (RLS) policies restrict member data while allowing admins (determined by the JWT `role` claim) to manage everything. A helper function keeps `daily_logs` in sync whenever meals, activities, or water entries are modified.

### Resetting demo data in Cosmos projects

1. **Purge existing auth users** – from the Supabase dashboard (Cosmos org), delete legacy accounts so only system identities remain.
2. **Create fresh demo users** – add `member@betterbites.com` (role `member`) and `admin@betterbites.com` (role `admin`) with known passwords (e.g. `BetterBites#2024`) so testers can sign in.
3. **Run the reset script** – execute the new helper to truncate domain tables and seed curated demo content:

   ```bash
   supabase db push --file supabase/sql/004_reset_seed_data.sql
   ```

   The script expects the two emails above to exist; it will raise a NOTICE if either account is missing.
4. **Verify** – confirm the dashboard, insights, and admin views show the seeded streaks, goals, flagged items, and motivational content.

After running the reset, point the Angular app to the refreshed project via `.env.local` (or edit `src/environments/environment*.ts`) so Supabase tokens resolve to the Cosmos instance.

## Next steps

1. **Wire Supabase project** – create (or reuse) a project under the Cosmos organization, run the base migration, and configure JWT custom claims to surface `role` to the client.
2. **Connect Angular app** – set `supabaseUrl`, `supabaseAnonKey`, and `openFoodFactsProxyUrl` in the environment files. Implement proper form submissions that call Supabase functions.
3. **Implement backend automation** – add Supabase Edge Functions for streak updates and nightly cron jobs.
4. **Testing** – add Angular unit/E2E coverage and FastAPI tests (pytest + httpx.AsyncClient) before production rollout.
5. **Deployment** – choose hosting (Vercel/Netlify for web, Fly.io/Railway for FastAPI) and wire CI/CD pipelines.

Refer to `better-bites-app-plan.md` for a narrative of the product vision and phased delivery milestones.

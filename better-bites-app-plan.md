Better Bites – Product & Architecture Plan
==========================================

NOTE: All supabase actions must be done in cosmos organization ONLY. If any doubts ask before implementation

1. Vision & Product Goals
-------------------------
- Deliver a holistic food tracking and fitness companion that blends quantitative tracking (calories, body measurements, streaks) with qualitative support (motivation, tips).
- Provide a differentiated experience using a responsive 3D avatar that reflects a member’s BMI and recent progress.
- Support both consumer users and an administrative staff who curate content, manage user accounts, and monitor data quality.

Key Success Metrics
- Daily active users vs. sign-ups (stickiness).
- Streak retention (7-day, 30-day).
- Average meals logged per user/day.
- Crash-free sessions and API error rates < 1%.
- Admin-curated content freshness (e.g., new motivational prompts weekly).


2. Personas & Core Journeys
---------------------------
Persona Highlights
- **Member (primary)**: Wants to lose/maintain weight, track water, log meals, see progress visually, stay motivated.
- **Admin (secondary)**: Oversees the community; manages tips, motivation content, verifies nutrition data anomalies, handles escalations.

Top Journeys
1. Member signs up → completes onboarding (height, weight, gender, activity level, goals) → lands on dashboard.
2. Member scans a barcode → sees nutrition data pulled from caching service → adds to meal log → daily calories update.
3. Member completes daily goals (calorie target, water intake, activity) → streak increments → motivational message shown.
4. Admin reviews flagged food entries → edits or approves entries → updates motivational library.
5. Member adjusts goals after progress (e.g., change weight target, water goal) → app recalibrates suggestions and avatar.


3. High-Level Feature Breakdown
-------------------------------
- Authentication & Authorization: Supabase(cosmos organization)Auth with role-based access (member, admin). Magic links + email/password.
- Onboarding & Profiles: Collect baseline vitals (height, weight, age, gender), dietary preferences, fitness goals. Allow later updates.
- Dashboard: Daily overview, streak status, quick actions (log meal, water, workouts), 3D avatar reflecting BMI trend.
- Meal Tracking:
  - Manual search (local DB curated items, common foods).
  - Barcode scanning via device camera (OpenFoodFacts cached proxy).
  - Calorie intake tracking vs. daily goal; macros breakdown.
- Water Tracking: Quick increment UI, daily goal, hydration streak integration.
- Activity Tracking: Manual entry and integration hooks for future wearable sync (scoped for later).
- Streak Engine: Tracks consecutive days meeting all configured goals (calories, water, workout). Supports partial streaks where only some goals met.
- Motivation & Tips:
  - Rotating motivational messages configurable by Admin.
  - Personalized recommendation cards (diet, exercise) based on goals, history, and Supabase stored tips.
- Progress & Analytics:
  - Historical data charts (weight, BMI, calories, water).
  - Weekly/monthly summaries with achievements.
- Admin tools: Manage users (deactivate, reset goals), content (motivation library, tips), view flagged entries, oversee barcode cache backlog.
- Notifications: Daily reminders (push/email) for logging and streak maintenance; configurable quiet hours by user.


4. System Architecture Overview
-------------------------------
Components
- **Angular Web App** (front-end SPA; responsive for mobile/desktop).
- **Supabase Backend** (Postgres DB, Auth, Storage, Realtime, Edge functions if needed).
- **Python Caching Service** (FastAPI/Fastify alternative) wrapping OpenFoodFacts with persistent storage and caching.
- In Supabase, make sure ALL RLS rules are proper with no warnnings.

Interaction Flow
```
Browser (Angular App)
    ↕ Supabase Auth (sign-up/sign-in, JWT)
    ↕ Supabase PostgREST / RPC (data CRUD)
    ↔ Supabase Storage (avatar assets, admin uploads)
    ↔ Python Proxy (OpenFoodFacts caching server)
OpenFoodFacts API (external)
```

- Use light theme
- Make website mobile responsive

Cross-cutting Concerns
- JWTs stored in memory with refresh flow; Angular interceptors attach tokens.
- Role-based row-level security (RLS) on Supabase tables.
- All network calls typed via generated TypeScript types (using Supabase typegen).
- Caching service rate-limits, logs, and caches results (Redis/SQLite).
- Observability: Supabase logs, caching server metrics (Prometheus-ready), client error monitoring via Sentry.


5. Angular Application Structure
--------------------------------
Framework Decisions
- Latest Angular (v20) with standalone components and Angular Router.
- Styling with Tailwind CSS or Angular Material + custom theme (choose based on in-house preference; plan assumes Tailwind for flexibility).
- 3D avatar rendered with Three.js via `@angular-three` bindings. (in dashboard, left side is entirely a man or a woman 3d image spinning slowly shhowing fat levels. Teach me how to do that, right side is scrollable with all the stats, etc)

Directory Top-Level
```
src/
  app/
    core/           (singleton services, interceptors, guards)
    shared/         (UI components, pipes, directives)
    auth/           (login, signup, password reset, guard)
    onboarding/     (collect profile data)
    dashboard/      (home view with widgets)
    tracking/
      meals/
      water/
      activity/
    streaks/
    insights/       (charts, trends)
    admin/          (role-gated routes)
    settings/
    app.config.ts
    app.routes.ts
```

Key Modules/Features
- **AuthFeature**: Components for login, registration, email verification, forgot password. Supabase JS client integration, guard for route protection.
- **OnboardingFlow**: Stepper capturing personal metrics, goals, preferences. Persists to `profiles`, `daily_goals`, `body_measurements`.
- **Dashboard**: Combines streak widget, 3D avatar component, quick logging actions, motivational carousel, daily summary.
- **MealTracking**: Search/scan entry forms, barcode scanner component (Web APIs on supported browsers), list of logged meals, macros summary. Integrates with caching server via Angular service.
- **WaterTracking**: Quick-add buttons, gauge visualization, hydration streak display.
- **ActivityTracking**: Manual entry forms and timeline; future integration placeholders for wearable sync services.
- **Streaks Module**: Visualizes current streak, achievements, progress to next milestone.
- **Insights Module**: Charts using ngx-charts or ApexCharts: weight trend, calorie consumption, goal adherence.
- **Admin Module**: Role-protected routes (guarded by Supabase role claims). Features: user list, content management (motivations, tips), flagged items queue, analytics overview.
- **Settings Module**: Profile edits, goal adjustments, notification preferences, privacy controls.

Client-Side Utilities
- Supabase service wrapper (handles session, typed queries).
- API service for caching server (`FoodDataService`).
- Avatar service to compute BMI and update avatar state.
- Notification scheduler (local reminders, push).
- Form utilities for validations (weight, height, etc).

Routing Strategy
- Guard routes by authentication status.
- Lazy load major feature areas (dashboard, tracking, admin) for performance.
- Provide skeleton loaders and optimistic UI for quick feedback.


6. 3D Avatar Experience
------------------------
- Implement with Three.js; asset pipeline: load base male/female models (GLTF). Apply morph targets based on BMI range (thin/average/muscular).
- Avatar states: `Underweight`, `Healthy`, `Overweight`, `Obese` with subtle transitions triggered by BMI calculations from latest `body_measurements`.
- Rotation: slow continuous spin with pause on hover/tap; allow user to switch gender presentation.
- Optionally highlight progress via color accents (glow/particles) when streak milestones achieved.
- Asset Storage: host GLTF and textures in Supabase Storage or a CDN. Provide fallback 2D illustration for low-powered devices.


7. Supabase Data Model
----------------------
Tables (excluding `auth.users`)
- `profiles`  
  - `user_id (uuid, PK, references auth.users)`  
  - `display_name`, `gender`, `date_of_birth`, `timezone`, `avatar_preference`, `activity_level`, `created_at`
- `body_measurements`  
  - `id (uuid PK)`, `user_id`, `height_cm`, `weight_kg`, `body_fat_pct`, `waist_cm`, `recorded_at`
- `daily_goals`  
  - `user_id (PK)`, `calories_target`, `protein_target`, `carbs_target`, `fat_target`, `water_ml_target`, `steps_target`, `updated_at`
- `daily_logs`  
  - `id`, `user_id`, `log_date`, `calories_consumed`, `protein_g`, `carbs_g`, `fat_g`, `water_ml`, `steps`, `notes`
- `meal_entries`  
  - `id`, `user_id`, `log_date`, `meal_type`, `description`, `quantity`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `source` (manual/barcode), `food_ref_id`
- `food_references`  
  - `id`, `barcode`, `name`, `brand`, `serving_size`, `calories`, `macros`, `micros`, `source` (openfoodfacts/admin), `last_synced_at`
- `activity_entries`  
  - `id`, `user_id`, `log_date`, `activity_type`, `duration_min`, `calories_burned`, `intensity`, `notes`
- `streaks`  
  - `id`, `user_id`, `streak_type` (`overall`, `water`, `workout`), `current_streak`, `best_streak`, `last_met_date`, `updated_at`
- `motivational_messages`  
  - `id`, `message`, `category`, `created_by`, `is_active`, `display_weight`
- `fitness_tips`  
  - `id`, `title`, `content`, `type` (diet/exercise/mindset), `tags`, `created_by`, `is_active`
- `admin_events` (audit)  
  - `id`, `admin_id`, `action`, `entity`, `entity_id`, `metadata`, `occurred_at`
- `flagged_items`  
  - `id`, `user_id`, `item_type`, `item_id`, `reason`, `status`, `handled_by`, `handled_at`

Additional Structures
- Supabase Edge functions (optional) for complex calculations (e.g., updating streaks when daily logs inserted).
- RLS Policies ensuring users can only read/write their data. Admin role (using Supabase JWT custom claims) bypasses restrictions.
- Database functions/triggers:
  - `update_daily_totals()` triggered on meal/activity/water insert to aggregate into `daily_logs`.
  - `maintain_streaks()` triggered nightly or on log updates to recalibrate streak counters.
  - Soft delete columns (`deleted_at`) for user data to support undo.


8. API Layer Design
-------------------
Supabase/PostgREST
- CRUD for user-specific tables via row-level security.
- RPC functions:
  - `calculate_bmi(user_id)` returning latest BMI snapshot.
  - `get_dashboard_summary(user_id, date)` for aggregated data.
  - `list_recommendations(user_id)` combining tips + motivation.

Python Caching Server (FastAPI)
- Endpoints:
  - `GET /health`
  - `GET /foods/{barcode}` – returns cached data or fetches from OpenFoodFacts, normalizes fields, stores result.
  - `POST /foods/bulk` – admin/backfill ingestion.
  - `POST /foods/{barcode}/refresh` – force refresh (admin).
  - `GET /search` – partial search by name/brand (uses local cache).
- Caching Strategy:
  - Primary store: SQLite or Postgres (if sharing with Supabase restricted). Each record stores payload, fetched_at, ttl.
  - In-memory layer: Redis or simple LRU in-process depending on deployment scale. Provide environment-driven toggle.
  - Data normalization ensures consistent fields (name, brand, macros per serving & per 100g).
  - Background task revalidation (Celery/APScheduler).
- Security:
  - JWT verification (same Supabase tokens) or service API key for admin operations.
  - Rate limiting per client IP.
  - Logging with correlation IDs for request tracing.


9. Streak & Gamification Logic
------------------------------
- Daily evaluation occurs when:
  - User logs any meal/water/activity entry (triggered function).
  - Nightly scheduled job runs in Supabase (cron) to ensure completeness.
- Criteria:
  - Calorie intake <= daily target + configurable buffer.
  - Water intake >= target.
  - Activity minutes >= target (if defined).
- `streaks` table updates `current_streak` and `best_streak`; resets on missed criteria.
- UI surfaces streak badges, upcoming milestones, and break warning (if user is close to breaking streak).
- Integrate with notifications (push/email) to remind user when streak at risk.


10. Motivation & Recommendation Engine
--------------------------------------
- Admin-curated motivational messages and tips stored in Supabase tables.
- Client fetches daily bundled payload (message + tip).
- Recommendation rules:
  - Based on BMI category, recent streak performance, goal type (weight loss, maintenance, muscle gain).
  - Basic rule engine using Supabase functions or computed in Angular service (initial phase).
- Future expansion: ML-driven personalization using Supabase Edge Functions + external service.


11. Admin Experience
--------------------
- Admin-only routes (secured by Supabase policies):
  - Dashboard: highlights flagged entries, content stats, recent sign-ups.
  - User management: search users, view profile summary, adjust roles, deactivate accounts.
  - Content libraries: CRUD on motivational messages, fitness tips.
  - Barcode cache management: review ingestion logs, refresh stale entries.
- Audit trail via `admin_events` table.
- Use Supabase Storage for content assets (image uploads for tips).


12. Deployment & DevOps
-----------------------
- Angular app deployed via static hosting (e.g., Supabase Storage + CDN, Vercel, Netlify).
- Python caching service containerized (Docker) and deployed on managed service (Railway, Fly.io) or Supabase Functions if using Edge-friendly Python runtime (future).
- Supabase project handles Postgres + Auth.
- Environment management:
  - `.env` for Angular (public & private segments).
  - Secrets in deployment platform; locally use `dotenv`.
- CI/CD:
  - Lint, unit tests, e2e tests (Playwright) for Angular.
  - Python service tests (pytest) + formatting (black, isort).
  - Automated schema migration using Supabase CLI + GitHub Actions.


13. Analytics, Monitoring & Feedback
------------------------------------
- Client analytics (Mixpanel/Amplitude) for user flows, conversion funnels.
- Error monitoring: Sentry (Angular + Python).
- Supabase logs and row-level metrics for DB performance.
- Collect voluntary feedback via in-app modal (store in `feedback` table).


14. Privacy & Compliance
------------------------
- Store only necessary health data; ensure privacy policy/EULA compliance.
- Provide data export/delete functionality to meet GDPR-like expectations.
- Encrypt sensitive data in transit (HTTPS) and rely on Supabase encryption at rest.
- Logging scrubs personal data; audit access for admins.


15. Phased Delivery Plan
------------------------
Phase 0 – Foundation
- Set up Supabase project, configure schema, RLS, seed data for tips/motivations.
- Scaffold Angular app, authentication flow, basic routing, Tailwind styling.
- Bootstrap Python caching service with health endpoint and local cache.

Phase 1 – Core Tracking
- Implement onboarding, dashboard skeleton, meal logging (manual), daily goals, basic streak logic.
- Integrate caching service for barcode lookups; support manual addition fallback.
- Render 3D avatar with basic BMI morphing and placeholders.

Phase 2 – Gamification & Insights
- Complete streak engine, motivational messaging, insights charts, water tracking.
- Expand avatar animations and progress cues.
- Introduce notifications and reminder settings.

Phase 3 – Admin Suite & Polish
- Build admin dashboard and management tools.
- Add activity tracking, flagged items workflow, audit logs.
- Harden caching server (refresh workflows, rate limiting, persistent storage).

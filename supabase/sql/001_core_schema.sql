-- Core schema for Better Bites application
-- Ensure uuid and timestamptz utilities exist
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

set search_path to public;

-- Profiles capture baseline user information and onboarding state
create table if not exists profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  gender text not null default 'prefer_not_to_say',
  date_of_birth date,
  timezone text not null default 'UTC',
  avatar_preference text not null default 'male',
  activity_level text not null default 'moderate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  recorded_at timestamptz not null default now(),
  height_cm numeric(5,2) not null,
  weight_kg numeric(5,2) not null,
  body_fat_pct numeric(5,2),
  waist_cm numeric(5,2),
  constraint body_measurements_user_recorded_at_key unique (user_id, recorded_at)
);

create index if not exists body_measurements_user_recorded_at_idx on body_measurements (user_id, recorded_at desc);

create table if not exists daily_goals (
  user_id uuid primary key references auth.users on delete cascade,
  calories_target integer not null,
  protein_target integer,
  carbs_target integer,
  fat_target integer,
  water_ml_target integer not null default 2000,
  steps_target integer,
  updated_at timestamptz not null default now()
);

create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,
  calories_consumed numeric(8,1) not null default 0,
  protein_g numeric(6,1) not null default 0,
  carbs_g numeric(6,1) not null default 0,
  fat_g numeric(6,1) not null default 0,
  water_ml numeric(7,1) not null default 0,
  steps integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_logs_user_date_key unique (user_id, log_date)
);

create index if not exists daily_logs_user_date_idx on daily_logs (user_id, log_date desc);

create table if not exists meal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,
  meal_type text not null,
  description text not null,
  quantity numeric(6,2) not null default 1,
  calories numeric(6,1) not null,
  protein_g numeric(6,1) not null default 0,
  carbs_g numeric(6,1) not null default 0,
  fat_g numeric(6,1) not null default 0,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create index if not exists meal_entries_user_date_idx on meal_entries (user_id, log_date desc);

create table if not exists activity_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,
  activity_type text not null,
  duration_min integer not null,
  intensity text,
  calories_burned numeric(6,1) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists activity_entries_user_date_idx on activity_entries (user_id, log_date desc);

create table if not exists water_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null default current_date,
  logged_at timestamptz not null default now(),
  volume_ml integer not null check (volume_ml > 0)
);

create index if not exists water_entries_user_logged_at_idx on water_entries (user_id, logged_at desc);
create index if not exists water_entries_user_date_idx on water_entries (user_id, log_date desc);

create table if not exists streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  streak_type text not null,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  last_met_date date,
  updated_at timestamptz not null default now(),
  constraint streaks_user_type_key unique (user_id, streak_type)
);

create table if not exists motivational_messages (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  category text not null default 'general',
  display_weight integer not null default 1,
  is_active boolean not null default true,
  created_by uuid references auth.users,
  created_at timestamptz not null default now()
);

create table if not exists fitness_tips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  type text not null default 'general',
  tags text[] default '{}',
  is_active boolean not null default true,
  created_by uuid references auth.users,
  created_at timestamptz not null default now()
);

create table if not exists admin_events (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users on delete cascade,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists flagged_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  item_type text not null,
  item_id uuid,
  reason text,
  status text not null default 'pending',
  handled_by uuid references auth.users,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  message text not null,
  submitted_at timestamptz not null default now(),
  sentiment text
);

-- Utility function to upsert daily log aggregates
create or replace function sync_daily_log(p_user_id uuid, p_log_date date)
returns void as $$
declare
  meal_totals record;
  activity_totals record;
  water_total numeric(7,1);
begin
  select coalesce(sum(calories), 0) as calories,
         coalesce(sum(protein_g), 0) as protein,
         coalesce(sum(carbs_g), 0) as carbs,
         coalesce(sum(fat_g), 0) as fat
    into meal_totals
    from meal_entries
   where user_id = p_user_id
     and log_date = p_log_date;

  select coalesce(sum(calories_burned), 0) as calories,
         coalesce(sum(duration_min), 0) as duration
    into activity_totals
    from activity_entries
   where user_id = p_user_id
     and log_date = p_log_date;

  select coalesce(sum(volume_ml), 0) into water_total
    from water_entries
   where user_id = p_user_id
     and log_date = p_log_date;

  insert into daily_logs as dl (
    user_id,
    log_date,
    calories_consumed,
    protein_g,
    carbs_g,
    fat_g,
    water_ml,
    steps
  ) values (
    p_user_id,
    p_log_date,
    meal_totals.calories,
    meal_totals.protein,
    meal_totals.carbs,
    meal_totals.fat,
    water_total,
    coalesce(activity_totals.duration, 0) * 100 -- placeholder conversion to steps
  )
  on conflict (user_id, log_date)
  do update set
    calories_consumed = excluded.calories_consumed,
    protein_g = excluded.protein_g,
    carbs_g = excluded.carbs_g,
    fat_g = excluded.fat_g,
    water_ml = excluded.water_ml,
    steps = excluded.steps,
    updated_at = now();
end;
$$ language plpgsql security definer;

-- Trigger helpers to maintain daily logs
create or replace function trg_sync_daily_logs_by_date()
returns trigger as $$
begin
  perform sync_daily_log(new.user_id, new.log_date);
  return new;
end;
$$ language plpgsql security definer;

create or replace function trg_sync_daily_logs_by_date_delete()
returns trigger as $$
begin
  perform sync_daily_log(old.user_id, old.log_date);
  return old;
end;
$$ language plpgsql security definer;

create or replace function trg_sync_daily_logs_by_logged_at()
returns trigger as $$
begin
  perform sync_daily_log(new.user_id, new.logged_at::date);
  return new;
end;
$$ language plpgsql security definer;

create or replace function trg_sync_daily_logs_by_logged_at_delete()
returns trigger as $$
begin
  perform sync_daily_log(old.user_id, old.logged_at::date);
  return old;
end;
$$ language plpgsql security definer;

create trigger meal_entries_sync_daily
  after insert or update on meal_entries
  for each row execute procedure trg_sync_daily_logs_by_date();

create trigger meal_entries_sync_daily_delete
  after delete on meal_entries
  for each row execute procedure trg_sync_daily_logs_by_date_delete();

create trigger activity_entries_sync_daily
  after insert or update on activity_entries
  for each row execute procedure trg_sync_daily_logs_by_date();

create trigger activity_entries_sync_daily_delete
  after delete on activity_entries
  for each row execute procedure trg_sync_daily_logs_by_date_delete();

create trigger water_entries_sync_daily
  after insert or update on water_entries
  for each row execute procedure trg_sync_daily_logs_by_date();

create trigger water_entries_sync_daily_delete
  after delete on water_entries
  for each row execute procedure trg_sync_daily_logs_by_date_delete();

-- RLS configuration
alter table profiles enable row level security;
alter table body_measurements enable row level security;
alter table daily_goals enable row level security;
alter table daily_logs enable row level security;
alter table meal_entries enable row level security;
alter table activity_entries enable row level security;
alter table water_entries enable row level security;
alter table streaks enable row level security;
alter table motivational_messages enable row level security;
alter table fitness_tips enable row level security;
alter table admin_events enable row level security;
alter table flagged_items enable row level security;
alter table feedback enable row level security;

-- Member access policies
create policy profiles_select_self on profiles
  for select using (auth.uid() = user_id);

create policy profiles_insert_self on profiles
  for insert with check (auth.uid() = user_id);

create policy profiles_update_self on profiles
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy profiles_delete_self on profiles
  for delete using (auth.uid() = user_id);

create policy profiles_admin_read on profiles
  for select to authenticated using (auth.jwt() ->> 'role' = 'admin');

create policy body_measurements_select_self on body_measurements
  for select using (auth.uid() = user_id);

create policy body_measurements_insert_self on body_measurements
  for insert with check (auth.uid() = user_id);

create policy body_measurements_update_self on body_measurements
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy body_measurements_delete_self on body_measurements
  for delete using (auth.uid() = user_id);

create policy daily_goals_select_self on daily_goals
  for select using (auth.uid() = user_id);

create policy daily_goals_insert_self on daily_goals
  for insert with check (auth.uid() = user_id);

create policy daily_goals_update_self on daily_goals
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy daily_goals_delete_self on daily_goals
  for delete using (auth.uid() = user_id);

create policy daily_logs_select_self on daily_logs
  for select using (auth.uid() = user_id);

create policy meal_entries_select_self on meal_entries
  for select using (auth.uid() = user_id);

create policy meal_entries_insert_self on meal_entries
  for insert with check (auth.uid() = user_id);

create policy meal_entries_update_self on meal_entries
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy meal_entries_delete_self on meal_entries
  for delete using (auth.uid() = user_id);

create policy activity_entries_select_self on activity_entries
  for select using (auth.uid() = user_id);

create policy activity_entries_insert_self on activity_entries
  for insert with check (auth.uid() = user_id);

create policy activity_entries_update_self on activity_entries
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy activity_entries_delete_self on activity_entries
  for delete using (auth.uid() = user_id);

create policy water_entries_select_self on water_entries
  for select using (auth.uid() = user_id);

create policy water_entries_insert_self on water_entries
  for insert with check (auth.uid() = user_id);

create policy water_entries_update_self on water_entries
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy water_entries_delete_self on water_entries
  for delete using (auth.uid() = user_id);

create policy streaks_select_self on streaks
  for select using (auth.uid() = user_id);

create policy motivational_messages_member_read on motivational_messages
  for select to authenticated using (true);

create policy motivational_messages_admin_insert on motivational_messages
  for insert to authenticated
  with check (auth.jwt() ->> 'role' = 'admin');

create policy motivational_messages_admin_update on motivational_messages
  for update to authenticated
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

create policy motivational_messages_admin_delete on motivational_messages
  for delete to authenticated
  using (auth.jwt() ->> 'role' = 'admin');

create policy fitness_tips_member_read on fitness_tips
  for select to authenticated using (true);

create policy fitness_tips_admin_insert on fitness_tips
  for insert to authenticated
  with check (auth.jwt() ->> 'role' = 'admin');

create policy fitness_tips_admin_update on fitness_tips
  for update to authenticated
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

create policy fitness_tips_admin_delete on fitness_tips
  for delete to authenticated
  using (auth.jwt() ->> 'role' = 'admin');

create policy admin_events_admin_read on admin_events
  for select to authenticated using (auth.jwt() ->> 'role' = 'admin');

create policy flagged_items_select_self on flagged_items
  for select using (auth.uid() = user_id);

create policy flagged_items_insert_self on flagged_items
  for insert with check (auth.uid() = user_id);

create policy flagged_items_update_self on flagged_items
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy flagged_items_delete_self on flagged_items
  for delete using (auth.uid() = user_id);

create policy flagged_items_admin_select on flagged_items
  for select to authenticated using (auth.jwt() ->> 'role' = 'admin');

create policy flagged_items_admin_insert on flagged_items
  for insert to authenticated
  with check (auth.jwt() ->> 'role' = 'admin');

create policy flagged_items_admin_update on flagged_items
  for update to authenticated
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

create policy flagged_items_admin_delete on flagged_items
  for delete to authenticated
  using (auth.jwt() ->> 'role' = 'admin');

create policy feedback_select_self on feedback
  for select using (auth.uid() = user_id);

create policy feedback_insert_self on feedback
  for insert with check (auth.uid() = user_id);

create policy feedback_update_self on feedback
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy feedback_delete_self on feedback
  for delete using (auth.uid() = user_id);

grant usage on schema public to service_role;

grant select on all tables in schema public to anon;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

update storage.buckets
  set public = true
where id = 'avatars';

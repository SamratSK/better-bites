-- Reset Better Bites domain tables and seed fresh demo data.
-- WARNING: This script truncates member-facing tables. Run only in dev/sandbox projects.

set search_path to public;

begin;

truncate table
  body_measurements,
  daily_logs,
  meal_entries,
  activity_entries,
  water_entries,
  streaks,
  daily_goals,
  flagged_items,
  admin_events,
  feedback,
  motivational_messages,
  fitness_tips,
  profiles
restart identity cascade;

insert into motivational_messages (message, category, display_weight, is_active)
values
  ('Small steps add up—log today''s meals!', 'consistency', 1, true),
  ('Hydrate before you''re thirsty—fill that bottle now.', 'hydration', 1, true),
  ('Your streak is your story. Keep the chapters going.', 'streaks', 1, true),
  ('You already showed up today. Finish strong with a balanced plate.', 'mindset', 1, true)
on conflict do nothing;

insert into fitness_tips (title, content, type, tags, is_active)
values
  ('Plan protein into every meal', 'Include a lean protein source with each meal to stay full and support recovery.', 'diet', array['protein','meal prep'], true),
  ('2-minute mobility reset', 'Stand up every hour and perform 2 minutes of dynamic stretching to stay loose.', 'exercise', array['mobility','habit'], true),
  ('Evening wind-down', 'Dim lights 30 minutes before bed and log tomorrow’s plan to improve sleep quality.', 'mindset', array['sleep','planning'], true),
  ('Weekend prep', 'Batch-cook grains and chop produce on Sunday to simplify weekday lunches.', 'diet', array['meal prep','consistency'], true)
on conflict do nothing;

do $$
declare
  admin_email constant text := 'admin@betterbites.com';
  member_email constant text := 'member@betterbites.com';
  admin_id uuid := (select id from auth.users where email = admin_email limit 1);
  member_id uuid := (select id from auth.users where email = member_email limit 1);
begin
  if member_id is null then
    raise notice 'Seed skipped: create % in Supabase Auth to load member demo data.', member_email;
  else
    insert into profiles (user_id, display_name, gender, date_of_birth, timezone, avatar_preference, activity_level)
    values
      (member_id, 'Jamie Rivera', 'female', '1995-04-17', 'America/Los_Angeles', 'female', 'moderate')
    on conflict (user_id) do update set
      display_name = excluded.display_name,
      gender = excluded.gender,
      date_of_birth = excluded.date_of_birth,
      timezone = excluded.timezone,
      avatar_preference = excluded.avatar_preference,
      activity_level = excluded.activity_level,
      updated_at = now();

    insert into daily_goals (user_id, calories_target, protein_target, carbs_target, fat_target, water_ml_target, steps_target, updated_at)
    values
      (member_id, 2100, 140, 230, 70, 2600, 8500, now())
    on conflict (user_id) do update set
      calories_target = excluded.calories_target,
      protein_target = excluded.protein_target,
      carbs_target = excluded.carbs_target,
      fat_target = excluded.fat_target,
      water_ml_target = excluded.water_ml_target,
      steps_target = excluded.steps_target,
      updated_at = now();

    insert into body_measurements (id, user_id, recorded_at, height_cm, weight_kg, body_fat_pct, waist_cm)
    values
      (gen_random_uuid(), member_id, (current_date - interval '28 days') + time '07:45', 170, 72, 25, 78),
      (gen_random_uuid(), member_id, (current_date - interval '7 days') + time '07:20', 170, 69.5, 23, 76);

    insert into daily_logs (user_id, log_date, calories_consumed, protein_g, carbs_g, fat_g, water_ml, steps)
    select
      member_id,
      (current_date - gs) as log_date,
      1850 + (gs * 35) as calories_consumed,
      120 + (gs * 2) as protein_g,
      210 + (gs * 3) as carbs_g,
      60 + gs as fat_g,
      2300 + (gs * 40) as water_ml,
      7200 + (gs * 180) as steps
    from generate_series(1, 6) as gs;

    insert into meal_entries (user_id, log_date, meal_type, description, quantity, calories, protein_g, carbs_g, fat_g, source)
    values
      (member_id, current_date, 'breakfast', 'Greek yogurt parfait with berries', 1, 320, 24, 38, 8, 'manual'),
      (member_id, current_date, 'lunch', 'Grilled chicken wrap with greens', 1, 540, 42, 50, 18, 'manual'),
      (member_id, current_date, 'snack', 'Protein shake (Better Bites)', 1, 210, 30, 12, 4, 'manual');

    insert into water_entries (user_id, log_date, logged_at, volume_ml)
    values
      (member_id, current_date, current_date + time '08:05', 350),
      (member_id, current_date, current_date + time '11:45', 500),
      (member_id, current_date, current_date + time '15:10', 450),
      (member_id, current_date, current_date + time '18:40', 400);

    insert into activity_entries (user_id, log_date, logged_at, activity_type, duration_min, intensity, calories_burned, notes)
    values
      (member_id, current_date, current_timestamp - interval '2 hours', 'Tempo Run', 35, 'high', 420, 'Sunset tempo session'),
      (member_id, current_date - 1, current_timestamp - interval '1 day', 'Strength Training', 45, 'moderate', 310, 'Push/pull split');

    insert into streaks (user_id, streak_type, current_streak, best_streak, last_met_date, updated_at)
    values
      (member_id, 'overall', 4, 14, current_date, now()),
      (member_id, 'water', 6, 12, current_date, now()),
      (member_id, 'workout', 3, 9, current_date - 1, now())
    on conflict (user_id, streak_type) do update set
      current_streak = excluded.current_streak,
      best_streak = excluded.best_streak,
      last_met_date = excluded.last_met_date,
      updated_at = now();

    insert into feedback (id, user_id, message, submitted_at, sentiment)
    values
      (gen_random_uuid(), member_id, 'Loving the avatar updates! Could we get reminders earlier?', now() - interval '2 days', 'positive');
  end if;

  if admin_id is null then
    raise notice 'Seed skipped: create % in Supabase Auth to load admin demo data.', admin_email;
  else
    insert into profiles (user_id, display_name, gender, date_of_birth, timezone, avatar_preference, activity_level)
    values
      (admin_id, 'Coach Aurora', 'female', '1988-01-09', 'America/New_York', 'female', 'active')
    on conflict (user_id) do update set
      display_name = excluded.display_name,
      gender = excluded.gender,
      date_of_birth = excluded.date_of_birth,
      timezone = excluded.timezone,
      avatar_preference = excluded.avatar_preference,
      activity_level = excluded.activity_level,
      updated_at = now();

    insert into daily_goals (user_id, calories_target, protein_target, carbs_target, fat_target, water_ml_target, steps_target, updated_at)
    values
      (admin_id, 2400, 160, 250, 80, 2800, 9000, now())
    on conflict (user_id) do update set
      calories_target = excluded.calories_target,
      protein_target = excluded.protein_target,
      carbs_target = excluded.carbs_target,
      fat_target = excluded.fat_target,
      water_ml_target = excluded.water_ml_target,
      steps_target = excluded.steps_target,
      updated_at = now();

    insert into admin_events (admin_id, action, entity, entity_id, metadata, occurred_at)
    values
      (admin_id, 'content_review', 'motivational_messages', null, jsonb_build_object('notes', 'Refreshed hydration prompts'), now() - interval '1 day'),
      (admin_id, 'flagged_item_triage', 'flagged_items', null, jsonb_build_object('count', 1), now());
  end if;

  if admin_id is not null and member_id is not null then
    insert into flagged_items (user_id, item_type, item_id, reason, status, handled_by, handled_at, created_at)
    values
      (
        member_id,
        'meal_entry',
        null,
        'Calories unusually high for manual entry',
        'pending',
        null,
        null,
        now() - interval '12 hours'
      ),
      (
        member_id,
        'activity_entry',
        null,
        'Workout intensity flagged for review',
        'in_review',
        admin_id,
        now() - interval '2 hours',
        now() - interval '18 hours'
      );
  end if;
end $$;

commit;

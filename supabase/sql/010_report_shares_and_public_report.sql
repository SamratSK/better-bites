set search_path to public;

create table if not exists report_shares (
  user_id uuid primary key references auth.users on delete cascade,
  share_enabled boolean not null default false,
  share_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table report_shares enable row level security;

create policy report_shares_select_self on report_shares
  for select using (auth.uid() = user_id);

create policy report_shares_insert_self on report_shares
  for insert with check (auth.uid() = user_id);

create policy report_shares_update_self on report_shares
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy report_shares_delete_self on report_shares
  for delete using (auth.uid() = user_id);

create or replace function get_public_report(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  report_user_id uuid;
begin
  select user_id
    into report_user_id
    from report_shares
   where share_token = p_token
     and share_enabled = true;

  if report_user_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'display_name', display_name,
        'gender', gender,
        'timezone', timezone,
        'avatar_preference', avatar_preference,
        'activity_level', activity_level,
        'created_at', created_at
      )
      from profiles
      where user_id = report_user_id
    ),
    'daily_goals', (
      select row_to_json(dg)
      from daily_goals dg
      where user_id = report_user_id
    ),
    'latest_measurement', (
      select jsonb_build_object(
        'recorded_at', recorded_at,
        'height_cm', height_cm,
        'weight_kg', weight_kg,
        'body_fat_pct', body_fat_pct,
        'waist_cm', waist_cm
      )
      from body_measurements
      where user_id = report_user_id
      order by recorded_at desc
      limit 1
    ),
    'streaks', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'streak_type', streak_type,
            'current_streak', current_streak,
            'best_streak', best_streak,
            'last_met_date', last_met_date
          )
          order by streak_type
        ),
        '[]'::jsonb
      )
      from streaks
      where user_id = report_user_id
    ),
    'recent_logs', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'log_date', log_date,
            'calories_consumed', calories_consumed,
            'protein_g', protein_g,
            'carbs_g', carbs_g,
            'fat_g', fat_g,
            'water_ml', water_ml,
            'steps', steps
          )
          order by log_date desc
        ),
        '[]'::jsonb
      )
      from daily_logs
      where user_id = report_user_id
        and log_date >= (current_date - interval '6 days')
    )
  );
end;
$$;

grant execute on function get_public_report(uuid) to anon;
grant execute on function get_public_report(uuid) to authenticated;

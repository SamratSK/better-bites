set search_path to public;

drop table if exists streaks;

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

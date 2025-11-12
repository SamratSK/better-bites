set search_path to public;

alter table water_entries
  add column if not exists log_date date;

update water_entries
   set log_date = logged_at::date
 where log_date is null;

alter table water_entries
  alter column log_date set default current_date,
  alter column log_date set not null;

create index if not exists water_entries_user_date_idx on water_entries (user_id, log_date desc);

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
    coalesce(activity_totals.duration, 0) * 100
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

-- Re-create triggers so water entries use log_date-based sync helpers
drop trigger if exists water_entries_sync_daily on water_entries;
create trigger water_entries_sync_daily
  after insert or update on water_entries
  for each row execute procedure trg_sync_daily_logs_by_date();

drop trigger if exists water_entries_sync_daily_delete on water_entries;
create trigger water_entries_sync_daily_delete
  after delete on water_entries
  for each row execute procedure trg_sync_daily_logs_by_date_delete();

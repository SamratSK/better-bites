set search_path to public;

create or replace function trg_sync_daily_logs_by_date()
returns trigger
language plpgsql
security definer
as $$
declare
  target_user uuid;
  target_date date;
  result record;
begin
  if tg_op = 'DELETE' then
    target_user := old.user_id;
    target_date := old.log_date;
    result := old;
  else
    target_user := new.user_id;
    target_date := new.log_date;
    result := new;
  end if;

  if target_user is not null and target_date is not null then
    perform sync_daily_log(target_user, target_date);
  end if;

  return result;
end;
$$;

create or replace function trg_sync_daily_logs_by_logged_at()
returns trigger
language plpgsql
security definer
as $$
declare
  target_user uuid;
  target_ts timestamptz;
  result record;
begin
  if tg_op = 'DELETE' then
    target_user := old.user_id;
    target_ts := old.logged_at;
    result := old;
  else
    target_user := new.user_id;
    target_ts := new.logged_at;
    result := new;
  end if;

  if target_user is not null and target_ts is not null then
    perform sync_daily_log(target_user, target_ts::date);
  end if;

  return result;
end;
$$;

drop trigger if exists meal_entries_sync_daily on meal_entries;
create trigger meal_entries_sync_daily
  after insert or update on meal_entries
  for each row execute procedure trg_sync_daily_logs_by_date();

drop trigger if exists meal_entries_sync_daily_delete on meal_entries;
create trigger meal_entries_sync_daily_delete
  after delete on meal_entries
  for each row execute procedure trg_sync_daily_logs_by_date();

drop trigger if exists activity_entries_sync_daily on activity_entries;
create trigger activity_entries_sync_daily
  after insert or update on activity_entries
  for each row execute procedure trg_sync_daily_logs_by_date();

drop trigger if exists activity_entries_sync_daily_delete on activity_entries;
create trigger activity_entries_sync_daily_delete
  after delete on activity_entries
  for each row execute procedure trg_sync_daily_logs_by_date();

drop trigger if exists water_entries_sync_daily on water_entries;
create trigger water_entries_sync_daily
  after insert or update on water_entries
  for each row execute procedure trg_sync_daily_logs_by_logged_at();

drop trigger if exists water_entries_sync_daily_delete on water_entries;
create trigger water_entries_sync_daily_delete
  after delete on water_entries
  for each row execute procedure trg_sync_daily_logs_by_logged_at();

set search_path to public;

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

-- Recreate triggers to use the new helper functions
drop trigger if exists meal_entries_sync_daily on meal_entries;
create trigger meal_entries_sync_daily
  after insert or update on meal_entries
  for each row execute procedure trg_sync_daily_logs_by_date();

drop trigger if exists meal_entries_sync_daily_delete on meal_entries;
create trigger meal_entries_sync_daily_delete
  after delete on meal_entries
  for each row execute procedure trg_sync_daily_logs_by_date_delete();

drop trigger if exists activity_entries_sync_daily on activity_entries;
create trigger activity_entries_sync_daily
  after insert or update on activity_entries
  for each row execute procedure trg_sync_daily_logs_by_date();

drop trigger if exists activity_entries_sync_daily_delete on activity_entries;
create trigger activity_entries_sync_daily_delete
  after delete on activity_entries
  for each row execute procedure trg_sync_daily_logs_by_date_delete();

drop trigger if exists water_entries_sync_daily on water_entries;
create trigger water_entries_sync_daily
  after insert or update on water_entries
  for each row execute procedure trg_sync_daily_logs_by_logged_at();

drop trigger if exists water_entries_sync_daily_delete on water_entries;
create trigger water_entries_sync_daily_delete
  after delete on water_entries
  for each row execute procedure trg_sync_daily_logs_by_logged_at_delete();

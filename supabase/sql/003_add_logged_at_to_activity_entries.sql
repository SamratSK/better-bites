alter table if exists activity_entries
  add column if not exists logged_at timestamptz not null default now();

create index if not exists activity_entries_logged_at_idx on activity_entries (logged_at desc);

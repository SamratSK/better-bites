set search_path to public;

alter table profiles
  add column if not exists role text not null default 'member';

create index if not exists profiles_role_idx on profiles (role);

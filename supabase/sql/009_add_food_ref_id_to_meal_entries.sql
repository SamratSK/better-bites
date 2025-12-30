set search_path to public;

alter table meal_entries
  add column if not exists food_ref_id uuid;

create index if not exists meal_entries_food_ref_id_idx on meal_entries (food_ref_id);

set search_path to public;

insert into motivational_messages (message, category, display_weight, is_active)
values
  ('Small steps add up—log today''s meals!', 'consistency', 1, true),
  ('Hydrate before you''re thirsty—fill that bottle now.', 'hydration', 1, true),
  ('Your streak is your story. Keep the chapters going.', 'streaks', 1, true)
  on conflict do nothing;

insert into fitness_tips (title, content, type, tags, is_active)
values
  ('Plan protein into every meal', 'Include a lean protein source with each meal to stay full and support recovery.', 'diet', array['protein','meal prep'], true),
  ('2-minute mobility reset', 'Stand up every hour and perform 2 minutes of dynamic stretching to stay loose.', 'exercise', array['mobility','habit'], true),
  ('Evening wind-down', 'Dim lights 30 minutes before bed and log tomorrow’s plan to improve sleep quality.', 'mindset', array['sleep','planning'], true)
  on conflict do nothing;

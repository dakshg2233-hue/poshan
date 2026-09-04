-- Age, sex and physical activity level: the three inputs a real maintenance-
-- calorie estimate needs alongside height and weight. Without sex specifically,
-- ICMR-NIN's own energy tables can't be applied at all — sedentary men and
-- women differ by 450 kcal/day at the same weight, so guessing one would
-- misinform rather than approximate.
--
-- tdee is added too: the Profile type and MacroPersonalizer have referenced
-- profile.tdee since before this migration, but the column never existed —
-- every read of it silently returned undefined.
alter table public.profiles
  add column if not exists age smallint check (age between 13 and 120),
  add column if not exists sex text check (sex in ('male', 'female')),
  add column if not exists activity_level text
    check (activity_level in ('sedentary', 'moderate', 'heavy')),
  add column if not exists tdee integer check (tdee between 500 and 6000);

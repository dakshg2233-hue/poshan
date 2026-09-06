-- The gamification layer's schema: per-person opt-out, public-leaderboard
-- opt-in with an auto-generated pseudonym (no user-chosen display name,
-- so there's nothing to impersonate or moderate), and a real "voice"
-- source value so the Voice of the Kitchen badge is honestly earnable —
-- until now a voice-matched log was recorded as source 'manual',
-- indistinguishable from picking a dish off a dropdown.

alter table public.profiles
  add column if not exists gamification_enabled boolean not null default true,
  add column if not exists leaderboard_opt_in boolean not null default false,
  add column if not exists leaderboard_handle text;

alter table public.family_members
  add column if not exists gamification_enabled boolean not null default true;

-- Postgres can't alter a check constraint in place — drop and recreate
-- with 'voice' added. The name matches what an inline, unnamed check on
-- this column would have been assigned when the table was first created.
alter table public.daily_meal_logs
  drop constraint if exists daily_meal_logs_source_check;
alter table public.daily_meal_logs
  add constraint daily_meal_logs_source_check
  check (source in ('scan', 'manual', 'recommended', 'voice'));

create index if not exists idx_profiles_leaderboard_opt_in
  on public.profiles(leaderboard_opt_in) where leaderboard_opt_in;

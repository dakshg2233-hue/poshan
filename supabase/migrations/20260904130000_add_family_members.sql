-- Family profiles (Poshan Home / Premium feature — PREMIUM_FEATURES in
-- poshan-data.ts promises "up to six family profiles").
--
-- A new, separate table rather than reworking `profiles` into a multi-row
-- shape: the same reasoning user_conditions already follows for keeping
-- sensitive data in its own table applies here too, and it means every
-- existing query against `profiles` (one row per auth.users id) keeps
-- working unchanged. The account owner's own profile row stays where it
-- is; family_members holds up to 5 more, so "up to six" total is the
-- owner's profile plus five here. The cap is enforced in the API route
-- (src/app/api/family/route.ts), not a DB constraint — Postgres CHECK
-- constraints can't express a per-user row count, and app-level caps are
-- already this codebase's pattern (e.g. the free-tier scan limit in
-- food-scanner.tsx).
create table if not exists public.family_members (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references auth.users(id) on delete cascade,
  full_name       text not null,
  relationship    text,
  height_cm       smallint check (height_cm between 80 and 250),
  weight_kg       numeric(5,2) check (weight_kg between 20 and 400),
  region          text check (region in ('north','south','east','west')),
  diet            text check (diet in ('veg','nonveg','vegan','jain')),
  goal            text check (goal in ('loss','muscle','diabetes','pcos','thyroid')),
  -- 0, not 13: unlike the account owner's own profiles.age (adults signing
  -- themselves up), a family member can be a child. estimateMaintenanceKcal
  -- already returns null under 19 (energy-requirement.ts) rather than a
  -- number calculated for the wrong population, so storing a child's real
  -- age is safe — the UI just won't show a maintenance-calorie figure for
  -- them, the same honest gap it already leaves for the primary account.
  age             smallint check (age between 0 and 120),
  sex             text check (sex in ('male','female')),
  activity_level  text check (activity_level in ('sedentary','moderate','heavy')),
  tdee            integer check (tdee between 500 and 6000),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.family_members enable row level security;

create policy "read own family members"
  on public.family_members for select
  to authenticated using ((select auth.uid()) = account_id);
create policy "insert own family members"
  on public.family_members for insert
  to authenticated with check ((select auth.uid()) = account_id);
create policy "update own family members"
  on public.family_members for update
  to authenticated
  using ((select auth.uid()) = account_id)
  with check ((select auth.uid()) = account_id);
create policy "delete own family members"
  on public.family_members for delete
  to authenticated using ((select auth.uid()) = account_id);

create index if not exists idx_family_members_account
  on public.family_members(account_id);

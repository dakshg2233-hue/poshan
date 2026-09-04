-- The Poshan Daily Decision Engine: the tables behind "what should I eat
-- today" (src/lib/daily-engine.ts) and its retention loop (log a meal,
-- track what's in the kitchen, log weight, mark a busy/tight-budget day).
--
-- All four tables key off the ACCOUNT owner's auth.uid(), the same pattern
-- family_members already uses — a family member has no login of their own,
-- so `family_member_id` is an optional pointer to which profile a row is
-- about, not a second RLS boundary. null means "the account owner".

-- --------------------------------------------------------------- weight_logs
-- A history table profiles.weight_kg never had: that column only ever held
-- the current value, so there was no way to show a trend anywhere — not on
-- the consumer dashboard, not on the clinician's patient view. One log per
-- person per day; logging again the same day overwrites, it doesn't duplicate.
create table if not exists public.weight_logs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  family_member_id  uuid references public.family_members(id) on delete cascade,
  weight_kg         numeric(5,2) not null check (weight_kg between 20 and 400),
  logged_on         date not null default current_date,
  created_at        timestamptz default now(),
  -- `nulls not distinct`: family_member_id is null for the account owner's
  -- own weight, and plain SQL treats null != null, which would let the
  -- owner insert unlimited "duplicate" rows for the same day since the
  -- unique constraint would never consider them equal. This is what makes
  -- the upsert in /api/weight (onConflict: user_id,family_member_id,
  -- logged_on) actually overwrite same-day entries for the owner, not just
  -- for family members.
  unique nulls not distinct (user_id, family_member_id, logged_on)
);

alter table public.weight_logs enable row level security;

create policy "read own weight logs"
  on public.weight_logs for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own weight logs"
  on public.weight_logs for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "update own weight logs"
  on public.weight_logs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "delete own weight logs"
  on public.weight_logs for delete
  to authenticated using ((select auth.uid()) = user_id);

create index if not exists idx_weight_logs_user
  on public.weight_logs(user_id, family_member_id, logged_on desc);

-- ----------------------------------------------------------- daily_meal_logs
-- What was actually eaten. dish_id is a MEAL_LIBRARY id (poshan-data.ts) —
-- not a foreign key, because the library lives in code, not a table. This
-- is what turns "what I ate yesterday" from an aspiration into a real
-- signal the recommendation engine can read (see recommendToday's
-- recentDishIds), and it's the first thing this app has ever persisted
-- about a user's actual eating, as opposed to their stated profile.
create table if not exists public.daily_meal_logs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  family_member_id  uuid references public.family_members(id) on delete cascade,
  log_date          date not null default current_date,
  meal_time         text not null check (meal_time in ('breakfast','lunch','dinner','snack')),
  dish_id           text not null,
  source            text not null default 'manual' check (source in ('scan','manual','recommended')),
  created_at        timestamptz default now()
);

alter table public.daily_meal_logs enable row level security;

create policy "read own meal logs"
  on public.daily_meal_logs for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own meal logs"
  on public.daily_meal_logs for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "delete own meal logs"
  on public.daily_meal_logs for delete
  to authenticated using ((select auth.uid()) = user_id);

create index if not exists idx_daily_meal_logs_user_date
  on public.daily_meal_logs(user_id, family_member_id, log_date desc);

-- -------------------------------------------------------------- pantry_items
-- "What's in my kitchen" — a coarse in-stock/out-of-stock toggle per staple
-- (the fixed PANTRY_STAPLES catalog in daily-engine.ts), not a quantity
-- tracker. item_key isn't constrained by a check() to the current catalog
-- on purpose: the catalog can grow in code without a migration to match it.
create table if not exists public.pantry_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_key    text not null,
  in_stock    boolean not null default true,
  updated_at  timestamptz default now(),
  unique (user_id, item_key)
);

alter table public.pantry_items enable row level security;

create policy "read own pantry"
  on public.pantry_items for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own pantry"
  on public.pantry_items for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "update own pantry"
  on public.pantry_items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "delete own pantry"
  on public.pantry_items for delete
  to authenticated using ((select auth.uid()) = user_id);

create index if not exists idx_pantry_items_user on public.pantry_items(user_id);

-- ------------------------------------------------------------- daily_context
-- Today's "am I busy" and "what's my budget today" signals — deliberately
-- per-day, not a permanent profile field: a busy Tuesday says nothing about
-- Wednesday, and today's grocery budget isn't a fixed trait either.
create table if not exists public.daily_context (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  context_date  date not null default current_date,
  is_busy       boolean not null default false,
  budget_pref   text check (budget_pref in ('budget','moderate','premium')),
  updated_at    timestamptz default now(),
  unique (user_id, context_date)
);

alter table public.daily_context enable row level security;

create policy "read own daily context"
  on public.daily_context for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own daily context"
  on public.daily_context for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "update own daily context"
  on public.daily_context for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists idx_daily_context_user_date
  on public.daily_context(user_id, context_date desc);

-- Poshan — database schema
-- Run this in the Supabase SQL editor.
--
-- SECURITY NOTE, read before changing anything:
-- The anon key is public. It ships in the browser and anyone can read it out
-- of the page. The ONLY thing standing between that key and your users' data
-- is Row Level Security. Every table below therefore enables RLS and denies
-- by default, then grants access only to rows the signed-in user owns.
-- A table without RLS is a public table, no matter how obscure its name is.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  height_cm       smallint check (height_cm between 80 and 250),
  weight_kg       numeric(5,2) check (weight_kg between 20 and 400),
  region          text check (region in ('north','south','east','west')),
  diet            text check (diet in ('veg','nonveg','vegan','jain')),
  goal            text check (goal in ('loss','muscle','diabetes','pcos','thyroid')),
  lang            text default 'en' check (lang in ('en','hi')),
  -- The three extra inputs a real maintenance-calorie estimate needs beyond
  -- height/weight. Sex specifically is required, not optional: ICMR-NIN's
  -- own energy tables are sex-differentiated by ~450 kcal/day at the same
  -- weight, so there is no honest way to estimate without it.
  age             smallint check (age between 13 and 120),
  sex             text check (sex in ('male','female')),
  activity_level  text check (activity_level in ('sedentary','moderate','heavy')),
  tdee            integer check (tdee between 500 and 6000),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ------------------------------------------------------- health conditions
-- Kept in its own table because this is the most sensitive data here.
-- Health information deserves its own row-level boundary, and separating it
-- means a bug in profile handling cannot spill medical history.
create table if not exists public.user_conditions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  condition   text not null check (condition in (
                'diabetes','hypertension','ckd','anaemia','hypothyroid',
                'pcos','nafld','coeliac','dyslipidaemia','gout','lactose')),
  created_at  timestamptz default now(),
  unique (user_id, condition)
);

alter table public.user_conditions enable row level security;

create policy "read own conditions"
  on public.user_conditions for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own conditions"
  on public.user_conditions for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "delete own conditions"
  on public.user_conditions for delete
  to authenticated using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------ biomarkers
create table if not exists public.biomarker_readings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  marker      text not null,
  value       numeric not null,
  unit        text not null,
  taken_on    date not null default current_date,
  created_at  timestamptz default now()
);

alter table public.biomarker_readings enable row level security;

create policy "read own readings"
  on public.biomarker_readings for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own readings"
  on public.biomarker_readings for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "delete own readings"
  on public.biomarker_readings for delete
  to authenticated using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------ subscriptions
-- Written ONLY by the server using the service-role key, after a Razorpay
-- signature has been verified. Users may read their own row and nothing else;
-- there is deliberately no insert or update policy, so a client holding the
-- anon key cannot grant itself a subscription.
create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  -- Which product this row is for. Separate from `plan`, which is only ever
  -- the billing cycle: without this there is no way to tell a Poshan Home
  -- subscriber from a future Clinic one.
  product             text not null default 'home'
                        check (product in ('home','practitioner','clinic','hospital','enterprise')),
  plan                text not null check (plan in ('monthly','yearly')),
  status              text not null default 'active'
                        check (status in ('trialing','active','cancelled','expired')),
  razorpay_order_id   text,
  razorpay_payment_id text unique,          -- unique = replay protection
  -- Stable across a subscription's whole lifetime, unlike payment_id which
  -- changes every billing cycle: this is the upsert key for recurring rows.
  razorpay_subscription_id text unique,
  amount_paise        integer not null check (amount_paise > 0),
  current_period_end  timestamptz,
  created_at          timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "read own subscription"
  on public.subscriptions for select
  to authenticated using ((select auth.uid()) = user_id);
-- No insert/update/delete policy on purpose. Service role bypasses RLS.

-- --------------------------------------------------------- payment attempts
-- Every verification attempt, successful or not. This is the audit trail you
-- need if a payment is ever disputed, and the unique payment id means the
-- same successful payment cannot be replayed to extend a subscription twice.
create table if not exists public.payment_events (
  id                  uuid primary key default gen_random_uuid(),
  -- Nullable: a subscription-based payment has no order_id at all.
  razorpay_order_id   text,
  razorpay_payment_id text not null unique,
  razorpay_subscription_id text,
  signature_valid     boolean not null,
  amount_paise        integer,
  source              text not null check (source in ('client','webhook')),
  raw                 jsonb,
  created_at          timestamptz default now()
);

alter table public.payment_events enable row level security;
-- No policies at all: server-only via service role. Nothing client-side
-- should ever read the payment ledger.

-- ----------------------------------------------------------- clinic leads
-- Hospital and Enterprise are deliberately not self-serve (PO/invoice, not
-- card) — see CLINIC_TIERS in poshan-data.ts. Backs the "Talk to us" form.
create table if not exists public.clinic_leads (
  id          uuid primary key default gen_random_uuid(),
  tier        text not null check (tier in ('hospital','enterprise')),
  name        text not null,
  org         text not null,
  email       text not null,
  phone       text,
  message     text,
  created_at  timestamptz default now()
);

alter table public.clinic_leads enable row level security;
-- No policies: written only by the API route via the service-role key. A
-- signed-out visitor submits this form, and even a signed-in one must never
-- read another lead's submission.

-- ---------------------------------------------------------- chat messages
-- Both chatbots ("Ask Poshan" for food/nutrition, "Health Companion" for
-- condition-focused guidance) share this table: one shared daily message
-- pool across both, one history store, one place to enforce the free-tier
-- limit.
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  chatbot    text not null check (chatbot in ('nutrition','health')),
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz default now()
);

alter table public.chat_messages enable row level security;

create policy "read own chat history"
  on public.chat_messages for select
  to authenticated using ((select auth.uid()) = user_id);
-- No insert/update/delete policy: written only by the API route via the
-- service-role key, so the daily quota can't be bypassed by writing rows
-- directly.

create index if not exists idx_chat_messages_user_day
  on public.chat_messages(user_id, chatbot, created_at desc);

create index if not exists idx_conditions_user on public.user_conditions(user_id);
create index if not exists idx_readings_user on public.biomarker_readings(user_id, taken_on desc);
create index if not exists idx_subs_user on public.subscriptions(user_id);
create index if not exists idx_subs_user_product on public.subscriptions(user_id, product);

-- --------------------------------------------------------------- profile hook
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''       -- empty is stricter than 'public'; the body below
                           -- fully-qualifies every object, so nothing resolves
                           -- through a hijackable search path
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Extensions to the Daily Decision Engine: vrat/festival day-type context,
-- family invite links, a PCOS/general symptom journal, and web-push
-- subscriptions. Each follows the same owner-only RLS pattern already used
-- throughout (see 20260905000000_add_daily_decision_engine.sql).

-- --------------------------------------------------------- daily_context
alter table public.daily_context
  add column if not exists day_type text not null default 'normal'
    check (day_type in ('normal', 'vrat', 'festival')),
  add column if not exists festival_name text;

-- ------------------------------------------------------------- family_invites
-- A safer, smaller version of "let a family member manage their own
-- profile" than giving them their own login against the existing
-- family_members rows would be: RLS on every family-scoped table
-- (weight_logs, daily_meal_logs, ...) currently trusts user_id = the
-- ACCOUNT OWNER's auth.uid(), so granting a second person write access to
-- "their own" family_member_id would mean redesigning that trust model —
-- real security surface, not a quick addition. Instead: the account owner
-- generates a token, shares the link, and whoever holds it fills in their
-- own profile once, through a server route using the service-role key
-- (authorised by knowing the token, not by a session). That becomes a
-- normal family_members row — no RLS changes, no new auth-linkage concept.
create table if not exists public.family_invites (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references auth.users(id) on delete cascade,
  token             text not null unique,
  status            text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  family_member_id  uuid references public.family_members(id) on delete set null,
  created_at        timestamptz default now(),
  expires_at        timestamptz not null default (now() + interval '14 days')
);

alter table public.family_invites enable row level security;

create policy "read own invites"
  on public.family_invites for select
  to authenticated using ((select auth.uid()) = account_id);
create policy "insert own invites"
  on public.family_invites for insert
  to authenticated with check ((select auth.uid()) = account_id);
create policy "update own invites"
  on public.family_invites for update
  to authenticated
  using ((select auth.uid()) = account_id)
  with check ((select auth.uid()) = account_id);
-- No select-by-token policy for anon/authenticated: a stranger holding a
-- guessed or leaked token must not be able to browse this table. The
-- accept flow (src/app/api/family/invite/[token]/route.ts) looks up a
-- token via the service-role key, which bypasses RLS entirely — that is
-- the one and only path a token is ever checked against this table.

create index if not exists idx_family_invites_account on public.family_invites(account_id);

-- --------------------------------------------------------------- symptom_logs
-- A PCOS-oriented (but not PCOS-only) daily symptom journal — the signal
-- biomarkers alone don't carry. One row per day; logging again the same
-- day overwrites, same convention as weight_logs.
create table if not exists public.symptom_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  log_date    date not null default current_date,
  energy      smallint check (energy between 1 and 5),
  mood        smallint check (mood between 1 and 5),
  bloating    boolean not null default false,
  cramps      boolean not null default false,
  -- Day of the current menstrual cycle, self-reported. Nullable: not every
  -- user tracking symptoms is tracking a cycle (thyroid/PCOS overlap).
  cycle_day   smallint check (cycle_day between 1 and 60),
  notes       text,
  created_at  timestamptz default now(),
  unique (user_id, log_date)
);

alter table public.symptom_logs enable row level security;

create policy "read own symptom logs"
  on public.symptom_logs for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own symptom logs"
  on public.symptom_logs for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "update own symptom logs"
  on public.symptom_logs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "delete own symptom logs"
  on public.symptom_logs for delete
  to authenticated using ((select auth.uid()) = user_id);

create index if not exists idx_symptom_logs_user_date on public.symptom_logs(user_id, log_date desc);

-- --------------------------------------------------------- push_subscriptions
-- Web Push endpoints (the browser's PushManager subscription, not a
-- WhatsApp/SMS channel — sending over WhatsApp needs a Business API
-- account and message-template approval this project doesn't have, so
-- this table is scoped to what's actually deliverable from here).
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth_key    text not null,
  created_at  timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

create policy "read own push subscriptions"
  on public.push_subscriptions for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own push subscriptions"
  on public.push_subscriptions for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "delete own push subscriptions"
  on public.push_subscriptions for delete
  to authenticated using ((select auth.uid()) = user_id);
-- No select policy for anyone but the owner: the actual send job
-- (src/app/api/push/send/route.ts) reads this table via the service-role
-- key, same pattern as chat_messages' quota check.

create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

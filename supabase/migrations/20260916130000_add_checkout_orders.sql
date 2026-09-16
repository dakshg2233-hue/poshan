-- An internal order ledger, so Poshan knows what it meant to charge.
--
-- Until now the only record of a subscription's price lived in Razorpay: the
-- Plan referenced by RAZORPAY_PLAN_ID_*. Poshan stored whatever amount the
-- webhook reported and had nothing to compare it against. That is safe —
-- the amount arrives over an HMAC-verified channel from Razorpay, never from
-- the browser, and access has never depended on it — but it is not
-- reconcilable. Edit a Plan's price in the Razorpay dashboard and Poshan
-- records the new number without noticing, with no trace that anything
-- changed.
--
-- This table is Poshan's own side of that ledger. The expected amount is
-- written at checkout from the app's own constants (PREMIUM, COLLEGE_PLAN in
-- poshan-data.ts), not from Razorpay and not from the client, so a
-- divergence between the two is visible in one query:
--
--   select * from checkout_orders where amount_mismatch;
--
-- A mismatch is recorded, never enforced. The customer's money has already
-- moved by the time anyone can compare, so refusing them access over an
-- accounting discrepancy punishes the wrong party.
create table if not exists public.checkout_orders (
  -- Internal, human-quotable in a support thread: POSHAN-<12 hex>.
  id                       text primary key,
  user_id                  uuid not null references auth.users(id) on delete cascade,
  product                  text not null,
  plan                     text not null check (plan in ('monthly','yearly')),
  -- What Poshan's own code believed this SKU costs, in paise, at the moment
  -- checkout started.
  expected_amount_paise    integer not null check (expected_amount_paise > 0),
  -- Null until Razorpay accepts the subscription. A row that stays null is a
  -- checkout that was started and never completed, which is worth keeping.
  razorpay_subscription_id text unique,
  -- Filled in by the webhook on every real charge.
  last_charged_amount_paise integer,
  amount_mismatch          boolean not null default false,
  created_at               timestamptz not null default now()
);

create index if not exists idx_checkout_orders_user on public.checkout_orders(user_id);
-- The reconciliation query: small, and only ever scans the rows that matter.
create index if not exists idx_checkout_orders_mismatch
  on public.checkout_orders(created_at desc) where amount_mismatch;

alter table public.checkout_orders enable row level security;
-- No policies at all: server-only via service role, the same shape as
-- payment_events and webhook_events. A customer has no business reading the
-- price ledger, not even their own row.

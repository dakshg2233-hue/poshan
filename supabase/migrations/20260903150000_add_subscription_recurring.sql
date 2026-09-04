-- Poshan Home moves from a one-time Razorpay Order to a real Razorpay
-- Subscription, so the "7 days free, then charged" promise on the pricing
-- page (premium.tsx's Day 0/5/7 timeline) is actually true instead of
-- charging immediately while the copy claims a trial.
--
-- razorpay_subscription_id is the stable identity across a subscription's
-- whole lifetime; razorpay_payment_id changes every billing cycle, so it can
-- no longer be the upsert key for recurring rows — each cycle must update
-- the same row, not insert a new one.
alter table public.subscriptions
  add column if not exists razorpay_subscription_id text unique;

-- A subscription-based payment has no order_id at all, unlike the one-time
-- Order flow this table was built for.
alter table public.payment_events
  alter column razorpay_order_id drop not null,
  add column if not exists razorpay_subscription_id text;

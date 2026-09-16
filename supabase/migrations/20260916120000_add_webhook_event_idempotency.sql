-- Webhook replay protection, keyed on Razorpay's own event id.
--
-- The webhook already had partial idempotency: payment_events.razorpay_payment_id
-- is unique, so the same charge could not be recorded twice. That covered
-- subscription.charged and nothing else, because it keys on a payment id and
-- the events that END a subscription — cancelled, halted, completed — carry no
-- payment entity at all. They could be replayed without limit.
--
-- In practice replaying a revocation is harmless (writing status='cancelled'
-- twice is the same row either way), and replaying a charge was already safe
-- because provisioning reads current_end back from Razorpay rather than
-- incrementing anything. This table is defence in depth, not a bug fix: it
-- makes "process each event exactly once" a property of the database instead
-- of a property we have to re-argue every time a new event type is handled.
--
-- Razorpay sends x-razorpay-event-id on every delivery and reuses it across
-- retries of the same event, which is what makes it usable as the key.
create table if not exists public.webhook_events (
  razorpay_event_id text primary key,
  -- Kept for debugging a delivery after the fact; nothing branches on it.
  event             text not null,
  received_at       timestamptz not null default now()
);

alter table public.webhook_events enable row level security;
-- No policies at all: server-only via service role, exactly like
-- payment_events. Nothing client-side should ever read the delivery log.

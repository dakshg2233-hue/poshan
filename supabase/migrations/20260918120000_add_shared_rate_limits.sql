-- A rate limiter that survives serverless.
--
-- src/lib/rate-limit.ts counts requests in a Map in process memory, and said
-- so honestly: "Good enough for a single instance. On serverless or
-- multi-instance hosting this resets per instance." Poshan now runs on
-- Netlify Functions, where concurrent requests can each land on a fresh
-- instance — so the counter is very nearly a no-op, and the guard it was
-- providing quietly stopped existing the day the site was deployed.
--
-- That matters most for two endpoints that take no authentication and spend
-- real money per call: /api/scan sends an uploaded photo to a vision model,
-- and /api/voice-log sends a transcript. Both are public on purpose — the
-- Food Scanner is a nav tab a logged-out visitor is meant to try — so the
-- answer is not to demand a login, it is to make the limit actually hold.
--
-- One row per bucket, one statement per check. The whole decision happens
-- inside the upsert so two concurrent requests cannot both read a stale
-- count and both decide they are under the limit.
create table if not exists public.rate_limits (
  key      text primary key,
  count    integer not null default 0,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;
-- No policies at all: service role only, like payment_events and
-- webhook_events. Nothing client-side has any business reading or writing
-- the thing that decides whether the client is allowed through.

-- Expired buckets are harmless but pointless to keep; this index makes the
-- occasional sweep cheap.
create index if not exists idx_rate_limits_reset on public.rate_limits(reset_at);

/**
 * Returns whether this key may proceed, and how long until the window
 * resets. SECURITY DEFINER so it runs with the table owner's rights rather
 * than the caller's — the table has no policies, so nothing else can reach
 * it.
 */
create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now   timestamptz := now();
  v_count integer;
  v_reset timestamptz;
begin
  insert into public.rate_limits as rl (key, count, reset_at)
  values (p_key, 1, v_now + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count = case when rl.reset_at <= v_now then 1 else rl.count + 1 end,
        reset_at = case when rl.reset_at <= v_now
                        then v_now + make_interval(secs => p_window_seconds)
                        else rl.reset_at end
  returning rl.count, rl.reset_at into v_count, v_reset;

  return query
    select v_count <= p_limit,
           greatest(0, ceil(extract(epoch from (v_reset - v_now))))::integer;
end;
$$;

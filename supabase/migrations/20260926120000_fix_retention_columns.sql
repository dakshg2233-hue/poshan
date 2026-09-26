-- Point retention at columns that exist, and settle the CERT-In question.
--
-- retention_policy said `created_at` for two tables that have no such
-- column. rate_limits has (key, count, reset_at); webhook_events has
-- (razorpay_event_id, event, received_at). apply_retention() runs every row
-- in one function call, so the first bad row raised, the whole call rolled
-- back, and nothing was deleted from any table, chat_messages included.
-- The pg_cron job scheduled in 20260922130000 has been failing every night
-- since, and a failure inside cron is seen by nobody.
--
-- The CERT-In Directions (2022) want ICT system logs kept for 180 days.
-- Decided per table, on what each one actually holds:
--
--   webhook_events: a log. One row per delivery, recording that an event
--   of a given type arrived at a given time. That is an audit trail of a
--   system talking to Poshan. It holds no personal data (a Razorpay event
--   id, an event name, a timestamp), so keeping it the full 180 days costs
--   users nothing. 90 -> 180.
--
--   rate_limits: not a log. One row per key, overwritten in place every
--   window. It never records that anything happened, only what the counter
--   says right now, so there is nothing in it that 180 days of retention
--   would preserve. Stays at 7, measured from reset_at, which is the only
--   timestamp it has.

update public.retention_policy
   set date_column = 'reset_at',
       rationale   = 'Abuse counters, overwritten in place each window. Not a '
                     'log under the CERT-In Directions: a row records the '
                     'current count, never an event. Useful for days, '
                     'meaningless for months.'
 where table_name = 'rate_limits';

update public.retention_policy
   set date_column = 'received_at',
       retain_days = 180,
       rationale   = 'Payment webhook deliveries: replay protection, and a log '
                     'of Razorpay calling Poshan. Kept 180 days for the CERT-In '
                     'Directions (2022) retention floor on ICT logs. Holds no '
                     'personal data.'
 where table_name = 'webhook_events';

-- One bad row must not cost every other table its retention again. Each
-- table now runs in its own subtransaction: a failure is recorded in the
-- result under that table's name and the loop carries on. It warns rather
-- than raises at the end: an exception there would roll back the deletes
-- that did succeed, which is the failure this is fixing. The warning lands
-- in the Postgres logs (Dashboard > Logs), and the returned jsonb names the
-- table and the error for anyone calling it by hand or via the route.
create or replace function public.apply_retention()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  rec     record;
  removed integer;
  result  jsonb := '{}'::jsonb;
  failed  text[] := '{}';
begin
  for rec in select table_name, retain_days, date_column from public.retention_policy loop
    begin
      execute format(
        'delete from public.%I where %I < now() - ($1::text || '' days'')::interval',
        rec.table_name, rec.date_column
      ) using rec.retain_days;
      get diagnostics removed = row_count;
      result := result || jsonb_build_object(rec.table_name, removed);
    exception when others then
      result := result || jsonb_build_object(rec.table_name, 'error: ' || sqlerrm);
      failed := failed || rec.table_name;
    end;
  end loop;

  if array_length(failed, 1) > 0 then
    raise warning 'apply_retention failed for %: %', failed, result;
  end if;

  return result;
end;
$fn$;

revoke all on function public.apply_retention() from public, anon, authenticated;

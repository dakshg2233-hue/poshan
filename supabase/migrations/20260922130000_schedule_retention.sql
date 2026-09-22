-- Put the retention job on a schedule.
--
-- 20260920120000 created apply_retention() and the retention_policy table
-- that drives it, but nothing ever called it. A retention policy that exists
-- only as a function is a document, not a practice: s.8(7) asks that personal
-- data actually stop being held once its purpose is served, and until this
-- runs on a timer, nothing has stopped being held.
--
-- pg_cron rather than an HTTP endpoint hit by an external scheduler. The
-- route at /api/privacy/retention still exists as a fallback, but the
-- database-side version is better on two counts: it cannot be reached from
-- the internet at all, so there is no secret to leak or rotate, and it
-- survives the app being redeployed, scaled to zero, or moved.
--
-- 03:00 UTC is 08:30 IST — after the overnight low and before the morning
-- peak, so a long delete does not land on either.

do $$
begin
  -- pg_cron is available on Supabase but must be enabled per project, and on
  -- some plans it is not offered at all. Wrapped so that a project without it
  -- gets a clear notice rather than a migration that refuses to apply and
  -- blocks everything queued behind it.
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice
      'pg_cron unavailable (%). Retention is NOT scheduled. Either enable the '
      'extension in Dashboard > Database > Extensions and re-run this '
      'migration, or point an external scheduler at POST /api/privacy/retention '
      'with the PUSH_CRON_SECRET bearer token.', sqlerrm;
    return;
  end;

  -- Unschedule first so re-running this migration replaces the job rather
  -- than failing on the duplicate name, or worse, quietly leaving two jobs
  -- deleting the same rows on the same schedule.
  begin
    perform cron.unschedule('poshan-retention');
  exception when others then
    /* No such job yet. That is the normal first-run path. */
    null;
  end;

  perform cron.schedule(
    'poshan-retention',
    '0 3 * * *',
    $job$select public.apply_retention()$job$
  );

  raise notice 'Retention scheduled: poshan-retention, daily at 03:00 UTC.';
end
$$;

-- To see what it has been doing:
--   select jobid, jobname, schedule, active from cron.job;
--   select * from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'poshan-retention')
--    order by start_time desc limit 20;
--
-- To stop it:
--   select cron.unschedule('poshan-retention');
--
-- To change a window, edit the row rather than this file — apply_retention()
-- reads retention_policy every run, so it takes effect on the next pass with
-- no deploy:
--   update public.retention_policy set retain_days = 365 where table_name = 'chat_messages';

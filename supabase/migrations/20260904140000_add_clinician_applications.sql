-- Clinician applications — the manual-verification step the clinician
-- platform design doc (plans/clinic-platform/000-scope-and-architecture.md)
-- calls out: a `clinicians` row is never self-inserted, so there has to be
-- somewhere for "I'd like to register as a clinician" to land before a real
-- clinicians row exists. Reviewed by hand, same operational shape as
-- clinic_leads.
create table if not exists public.clinician_applications (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  full_name             text not null,
  registration_number   text not null,
  registration_council  text not null,
  specialty             text,
  status                text not null default 'pending'
                          check (status in ('pending', 'approved', 'rejected')),
  created_at            timestamptz default now(),
  unique (user_id)
);

alter table public.clinician_applications enable row level security;

create policy "read own application"
  on public.clinician_applications for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own application"
  on public.clinician_applications for insert
  to authenticated with check ((select auth.uid()) = user_id);
-- No update/delete policy: once submitted, only Poshan (service role)
-- reviews and moves status to approved/rejected, then hand-inserts the real
-- clinicians row referencing the same user_id. Same manual-review boundary
-- clinic_leads already draws for the enterprise tiers.

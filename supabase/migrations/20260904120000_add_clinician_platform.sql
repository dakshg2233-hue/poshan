-- Clinician platform, Phase 1 (Practitioner tier only).
-- Design: plans/clinic-platform/000-scope-and-architecture.md
--
-- Same conventions as schema.sql: RLS enabled and deny-by-default on every
-- table, policies scoped to (select auth.uid()), CHECK constraints instead
-- of lookup tables, service-role bypasses RLS for anything that needs to be
-- written after a check a client-side policy can't safely express.

-- ------------------------------------------------------------- clinicians
-- A clinician is a role on top of an existing auth.users row, not a separate
-- account system. verified_at is null until Poshan manually confirms the
-- registration number — there is no self-registration API integration in
-- Phase 1, so a client can never insert its own "verified" clinician row.
create table if not exists public.clinicians (
  id                    uuid primary key references auth.users(id) on delete cascade,
  full_name             text not null,
  registration_number   text not null,
  registration_council  text not null,
  specialty             text,
  verified_at           timestamptz,
  created_at            timestamptz default now()
);

alter table public.clinicians enable row level security;

create policy "read own clinician row"
  on public.clinicians for select
  to authenticated using ((select auth.uid()) = id);
-- No insert/update policy: written only by the service role, after Poshan
-- confirms the registration number by hand. Letting a client self-insert
-- "I am a doctor" with no verification is the trust failure this whole
-- feature depends on avoiding.

-- ---------------------------------------------------------- patient_links
-- The consent record. Status starts 'pending' and only the PATIENT's own
-- redeem action can move it to 'active' — a clinician can create the
-- invite, but never the acceptance. "The patient grants you access and can
-- revoke it any time" (CLINIC_TIERS, poshan-data.ts) is enforced here, not
-- just promised in UI copy.
create table if not exists public.patient_links (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid references auth.users(id) on delete cascade,
  clinician_id        uuid not null references public.clinicians(id) on delete cascade,
  status              text not null default 'pending'
                        check (status in ('pending', 'active', 'revoked')),
  -- Single-use, time-limited invite code the clinician hands the patient
  -- out of band (in person, by phone, printed slip) — never emailed by
  -- Poshan on the clinician's behalf, which would let a clinician "invite"
  -- an address without that person's active participation.
  invite_code         text unique,
  invite_expires_at   timestamptz,
  linked_at           timestamptz,
  revoked_at          timestamptz,
  created_at          timestamptz default now(),
  -- patient_id is null while pending (no patient has redeemed it yet) —
  -- can't uniquely constrain (patient_id, clinician_id) directly, so this
  -- is enforced instead in the redeem route: reject a redeem if an active
  -- link between the same two ids already exists.
  constraint patient_links_active_needs_patient
    check (status = 'pending' or patient_id is not null)
);

alter table public.patient_links enable row level security;

create policy "patient reads own links"
  on public.patient_links for select
  to authenticated using ((select auth.uid()) = patient_id);
create policy "clinician reads own links"
  on public.patient_links for select
  to authenticated using ((select auth.uid()) = clinician_id);
create policy "patient revokes own link"
  on public.patient_links for update
  to authenticated
  using ((select auth.uid()) = patient_id and status = 'active')
  with check ((select auth.uid()) = patient_id and status = 'revoked');
-- No insert policy, and no policy letting the patient perform the
-- pending -> active redeem transition directly: redeeming has to check
-- expiry and single-use atomically (read the code, confirm not expired,
-- confirm not already redeemed, then update), which is a transaction a bare
-- RLS update policy cannot safely express. Both the invite-create and the
-- redeem step go through service-role API routes instead.

create index if not exists idx_patient_links_clinician
  on public.patient_links(clinician_id, status);
create index if not exists idx_patient_links_patient
  on public.patient_links(patient_id, status);

-- --------------------------------------------------------------- lab_values
create table if not exists public.lab_values (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references auth.users(id) on delete cascade,
  entered_by     uuid not null references public.clinicians(id),
  marker         text not null check (marker in
                   ('hba1c', 'creatinine', 'egfr', 'haemoglobin', 'ldl', 'hdl', 'triglycerides')),
  value          numeric not null,
  unit           text not null,
  taken_on       date not null,
  created_at     timestamptz default now()
);

alter table public.lab_values enable row level security;

create policy "patient reads own labs"
  on public.lab_values for select
  to authenticated using ((select auth.uid()) = patient_id);
create policy "linked clinician reads patient labs"
  on public.lab_values for select
  to authenticated using (
    exists (
      select 1 from public.patient_links
      where patient_links.patient_id = lab_values.patient_id
        and patient_links.clinician_id = (select auth.uid())
        and patient_links.status = 'active'
    )
  );
create policy "linked clinician inserts patient labs"
  on public.lab_values for insert
  to authenticated with check (
    entered_by = (select auth.uid())
    and exists (
      select 1 from public.patient_links
      where patient_links.patient_id = lab_values.patient_id
        and patient_links.clinician_id = (select auth.uid())
        and patient_links.status = 'active'
    )
  );
-- No update/delete: a lab value is a historical record, corrected by a new
-- row with a later taken_on, same principle biomarker_readings already
-- follows.

create index if not exists idx_lab_values_patient
  on public.lab_values(patient_id, taken_on desc);

-- --------------------------------------------------------------- care_plans
create table if not exists public.care_plans (
  id                       uuid primary key default gen_random_uuid(),
  patient_id               uuid not null references auth.users(id) on delete cascade,
  clinician_id             uuid not null references public.clinicians(id),
  based_on_lab_ids         uuid[] not null default '{}',
  -- The drafted plan: same dish-id + portion shape buildPlan() already
  -- returns (lib/poshan-data.ts), so the patient-facing renderer is the
  -- existing plan renderer, not a new one.
  plan_json                jsonb not null,
  -- Populated by running checkMealAll() (lib/conditions.ts) against every
  -- dish in plan_json for every condition in the patient's user_conditions,
  -- at draft time. Stored, not recomputed on read, so an approved plan is a
  -- permanent record of the safety check the clinician actually saw.
  safety_flags             jsonb not null default '[]',
  status                   text not null default 'draft'
                             check (status in ('draft', 'approved', 'sent')),
  -- Sign-off: both set together, only on the draft -> approved transition.
  -- approved_by_reg_number is a snapshot of clinicians.registration_number
  -- at approval time, not a live join — so a later change to a clinician's
  -- registered number never silently rewrites a past sign-off.
  approved_at              timestamptz,
  approved_by_reg_number   text,
  opened_by_patient_at     timestamptz,
  created_at               timestamptz default now()
);

alter table public.care_plans enable row level security;

create policy "patient reads own approved plans"
  on public.care_plans for select
  to authenticated using ((select auth.uid()) = patient_id and status in ('approved', 'sent'));
create policy "clinician reads own plans"
  on public.care_plans for select
  to authenticated using ((select auth.uid()) = clinician_id);
create policy "clinician inserts drafts for linked patients"
  on public.care_plans for insert
  to authenticated with check (
    clinician_id = (select auth.uid())
    and exists (
      select 1 from public.patient_links
      where patient_links.patient_id = care_plans.patient_id
        and patient_links.clinician_id = (select auth.uid())
        and patient_links.status = 'active'
    )
  );
create policy "clinician approves own drafts"
  on public.care_plans for update
  to authenticated
  using ((select auth.uid()) = clinician_id and status = 'draft')
  with check ((select auth.uid()) = clinician_id and status = 'approved');
-- Deliberately no policy letting a patient see a DRAFT plan. "You approve
-- every plan before the patient ever sees it" (CLINIC_TIERS) is enforced by
-- the predicate above, not by UI that merely happens not to show drafts.

create index if not exists idx_care_plans_patient
  on public.care_plans(patient_id, status);
create index if not exists idx_care_plans_clinician
  on public.care_plans(clinician_id, status);

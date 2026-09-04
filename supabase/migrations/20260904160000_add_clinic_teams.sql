-- Clinic tier: multi-seat practices on top of the Practitioner-tier
-- foundation. Additive on purpose — every policy below is a NEW permissive
-- policy alongside the existing Practitioner-tier ones, never a
-- replacement. Postgres OR's multiple permissive policies for the same
-- action together, so a solo Practitioner clinician (zero clinic_members
-- rows) keeps working exactly as before; these only ever ADD access, never
-- remove or narrow what already worked.

-- ------------------------------------------------------------------ clinics
create table if not exists public.clinics (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  logo_url    text,
  owner_id    uuid not null references public.clinicians(id),
  created_at  timestamptz default now()
);

-- ------------------------------------------------------------ clinic_members
-- A clinician belongs to at most one clinic in this model (unique on
-- clinician_id alone, not just the pair) — real multi-clinic staff exist,
-- but supporting that is a deliberately deferred complexity, not an
-- oversight. role gates management actions (inviting more clinicians,
-- reassigning patients) in application code; every member, admin or not,
-- gets the same shared-patient read/write access below.
--
-- Created before clinics' own RLS policy (below) is added, not before the
-- clinics TABLE — that only needs to exist, not be policy-complete, for
-- this table's own foreign key. Both tables' policies are added together
-- after both tables exist, so neither policy can reference a not-yet-real
-- table.
create table if not exists public.clinic_members (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics(id) on delete cascade,
  clinician_id  uuid not null references public.clinicians(id) on delete cascade,
  role          text not null default 'member' check (role in ('admin', 'member')),
  created_at    timestamptz default now(),
  unique (clinician_id)
);

create index if not exists idx_clinic_members_clinic on public.clinic_members(clinic_id);

alter table public.clinics enable row level security;

create policy "member reads own clinic"
  on public.clinics for select
  to authenticated using (
    exists (
      select 1 from public.clinic_members
      where clinic_members.clinic_id = clinics.id
        and clinic_members.clinician_id = (select auth.uid())
    )
  );
-- No insert/update policy: clinic creation and edits (name, logo) go
-- through a service-role API route, same reasoning as clinicians itself —
-- the route validates the caller is a verified clinician and, for updates,
-- that they're the clinic's admin, checks a bare RLS policy can't express
-- as cleanly as application code can.

alter table public.clinic_members enable row level security;

create policy "member reads own clinic's roster"
  on public.clinic_members for select
  to authenticated using (
    exists (
      select 1 from public.clinic_members self
      where self.clinic_id = clinic_members.clinic_id
        and self.clinician_id = (select auth.uid())
    )
  );
-- No insert/update/delete policy: membership changes (inviting a clinician
-- in, removing one) go through a service-role route that checks the caller
-- is the clinic's admin first.

-- ----------------------------------------------------------------- access helper
-- The single place "can this clinician see this patient" is decided for
-- the Clinic tier's shared-list policies below. SECURITY DEFINER because it
-- has to read patient_links and clinic_members on its own terms — without
-- it, evaluating one RLS-gated table's policy would require reading two
-- OTHER RLS-gated tables, which cannot resolve. This does NOT widen who the
-- function effectively runs as for the caller: requesting_clinician is
-- always passed in as (select auth.uid()) by the policies that call it, so
-- identity is still the real caller's, only the internal reads bypass RLS.
-- Kept to a single well-reviewed function rather than repeating this join
-- inline across five tables' policies, where the same mistake would have
-- to be avoided five times instead of once.
create or replace function public.has_shared_patient_access(
  target_patient uuid,
  requesting_clinician uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.patient_links pl
    join public.clinic_members owner_membership
      on owner_membership.clinician_id = pl.clinician_id
    join public.clinic_members self_membership
      on self_membership.clinic_id = owner_membership.clinic_id
    where pl.patient_id = target_patient
      and pl.status = 'active'
      and self_membership.clinician_id = requesting_clinician
  );
$$;

-- ------------------------------------------------- shared access: patient_links
-- Lets any clinic colleague see a patient link owned by the SAME clinic
-- (needed for the shared patient list), without touching the two existing
-- patient/clinician-only policies from the Practitioner-tier migration.
create policy "clinic member reads clinic's patient links"
  on public.patient_links for select
  to authenticated using (
    exists (
      select 1
      from public.clinic_members owner_membership
      join public.clinic_members self_membership
        on self_membership.clinic_id = owner_membership.clinic_id
      where owner_membership.clinician_id = patient_links.clinician_id
        and self_membership.clinician_id = (select auth.uid())
    )
  );
-- Reassignment (changing patient_links.clinician_id to a colleague) is
-- deliberately NOT a bare RLS update policy: it has to verify the new
-- clinician is in the same clinic, which goes through a service-role route
-- instead — same shape as invite creation.

-- ----------------------------------------------------- shared access: lab_values
create policy "clinic member reads patient labs via shared access"
  on public.lab_values for select
  to authenticated using (public.has_shared_patient_access(patient_id, (select auth.uid())));
create policy "clinic member inserts patient labs via shared access"
  on public.lab_values for insert
  to authenticated with check (
    entered_by = (select auth.uid())
    and public.has_shared_patient_access(patient_id, (select auth.uid()))
  );

-- ----------------------------------------------------- shared access: care_plans
create policy "clinic member reads patient plans via shared access"
  on public.care_plans for select
  to authenticated using (public.has_shared_patient_access(patient_id, (select auth.uid())));
create policy "clinic member inserts patient plans via shared access"
  on public.care_plans for insert
  to authenticated with check (
    clinician_id = (select auth.uid())
    and public.has_shared_patient_access(patient_id, (select auth.uid()))
  );
create policy "clinic member approves patient plans via shared access"
  on public.care_plans for update
  to authenticated
  using (status = 'draft' and public.has_shared_patient_access(patient_id, (select auth.uid())))
  with check (status = 'approved' and public.has_shared_patient_access(patient_id, (select auth.uid())));

-- ------------------------------------------------------- shared access: profiles
create policy "clinic member reads patient profile via shared access"
  on public.profiles for select
  to authenticated using (public.has_shared_patient_access(profiles.id, (select auth.uid())));

-- ------------------------------------------------- shared access: user_conditions
create policy "clinic member reads patient conditions via shared access"
  on public.user_conditions for select
  to authenticated using (public.has_shared_patient_access(user_conditions.user_id, (select auth.uid())));

-- ------------------------------------------------------------- plan_templates
-- "Plan templates your practice can reuse" (CLINIC_TIERS, poshan-data.ts).
-- Stores a dish selection only, no patient — applying a template still runs
-- the current patient's own conditions back through checkMealAll() at
-- draft time, so a template that's safe for one patient can never silently
-- skip the safety check for another.
create table if not exists public.plan_templates (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.clinics(id) on delete cascade,
  created_by   uuid not null references public.clinicians(id),
  name         text not null,
  dishes       jsonb not null, -- [{ id: mealId, time: MealTime }]
  created_at   timestamptz default now()
);

alter table public.plan_templates enable row level security;

create policy "clinic member reads clinic templates"
  on public.plan_templates for select
  to authenticated using (
    exists (
      select 1 from public.clinic_members
      where clinic_members.clinic_id = plan_templates.clinic_id
        and clinic_members.clinician_id = (select auth.uid())
    )
  );
create policy "clinic member creates clinic templates"
  on public.plan_templates for insert
  to authenticated with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.clinic_members
      where clinic_members.clinic_id = plan_templates.clinic_id
        and clinic_members.clinician_id = (select auth.uid())
    )
  );
create policy "clinic member deletes clinic templates"
  on public.plan_templates for delete
  to authenticated using (
    exists (
      select 1 from public.clinic_members
      where clinic_members.clinic_id = plan_templates.clinic_id
        and clinic_members.clinician_id = (select auth.uid())
    )
  );

create index if not exists idx_plan_templates_clinic on public.plan_templates(clinic_id);

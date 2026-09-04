-- Hospital tier: departments and a full audit trail on top of the
-- Clinic-tier foundation. "Everything in Clinic" (CLINIC_TIERS,
-- poshan-data.ts) is inherited automatically — a hospital is a clinic that
-- also has departments and audit logging, not a parallel system.

-- --------------------------------------------------------------- departments
-- "Departments: dietetics, endocrinology, nephrology kept separate"
-- (CLINIC_TIERS). Free-text name, not an enum: real hospitals name and
-- split their departments differently, and this app has no business
-- prescribing a fixed list.
create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics(id) on delete cascade,
  name        text not null,
  created_at  timestamptz default now(),
  unique (clinic_id, name)
);

alter table public.departments enable row level security;

create policy "clinic member reads clinic departments"
  on public.departments for select
  to authenticated using (
    exists (
      select 1 from public.clinic_members
      where clinic_members.clinic_id = departments.clinic_id
        and clinic_members.clinician_id = (select auth.uid())
    )
  );
-- No insert/update/delete policy: department management goes through a
-- service-role route that checks the caller is the clinic's admin first,
-- same shape as adding a clinician to the clinic.

create index if not exists idx_departments_clinic on public.departments(clinic_id);

alter table public.clinic_members
  add column if not exists department_id uuid references public.departments(id) on delete set null;

-- ----------------------------------------------------------- access helper
-- Redefines has_shared_patient_access (clinic-teams migration) rather than
-- adding a second, competing function: RLS permissive policies only ever
-- OR together, so a narrower "same department" rule could never override
-- the existing "same clinic" one if both existed side by side — the only
-- way to make Hospital-tier departments actually keep patients separate is
-- to change what the ONE function every relevant policy already calls
-- decides. Every policy built on top of this (lab_values, care_plans,
-- profiles, user_conditions) picks up the new behaviour automatically,
-- with no changes of its own.
--
-- Behaviour for a clinic with NO departments (every existing Clinic-tier
-- clinic, unchanged): identical to before — anyone in the clinic can see
-- anyone else's patients.
--
-- Behaviour for a clinic WITH departments (Hospital tier): narrows to
-- "same department as the patient's own clinician." Two members who are
-- both unassigned to any department (department_id null on both sides)
-- still match each other — a deliberately forgiving default for staff not
-- yet sorted into a department, not a gap that reaches outside the clinic.
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
      and (
        not exists (
          select 1 from public.departments d where d.clinic_id = owner_membership.clinic_id
        )
        or owner_membership.department_id is not distinct from self_membership.department_id
      )
  );
$$;

-- ---------------------------------------------------------------- audit_log
-- "Full audit trail: who read what, who approved what, when" (CLINIC_TIERS).
-- Append-only by design: no update or delete policy at all, for anyone,
-- including the writing routes — an audit trail that can be edited after
-- the fact isn't one.
create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.clinics(id) on delete cascade,
  actor_id     uuid not null references public.clinicians(id),
  patient_id   uuid references auth.users(id) on delete set null,
  action       text not null check (action in (
                 'read_patient_list', 'read_labs', 'read_plan',
                 'add_lab', 'draft_plan', 'approve_plan', 'export_pdf'
               )),
  created_at   timestamptz default now()
);

alter table public.audit_log enable row level security;

create policy "clinic admin reads own clinic's audit log"
  on public.audit_log for select
  to authenticated using (
    exists (
      select 1 from public.clinic_members
      where clinic_members.clinic_id = audit_log.clinic_id
        and clinic_members.clinician_id = (select auth.uid())
        and clinic_members.role = 'admin'
    )
  );
-- No insert policy: written only by API routes via the service role, as
-- each action actually happens — never by the client claiming an action
-- occurred.

create index if not exists idx_audit_log_clinic on public.audit_log(clinic_id, created_at desc);

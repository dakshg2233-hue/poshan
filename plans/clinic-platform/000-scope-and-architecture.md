# Clinician platform — scope and architecture

- **Status**: DESIGN
- **Commit**: 8b7426f (at time of writing)
- **Scope**: Phase 1 only — the Practitioner tier (₹999/mo or ₹9,999/yr, 1 clinician, up to 40 active patients), self-serve via the existing Razorpay subscription flow. Clinic/Hospital/Enterprise tiers are Phase 2+ and are **not** designed here beyond noting where Phase 1's foundation supports them.

## Why this scope

`CLINIC_TIERS` in [poshan-data.ts](../../src/lib/poshan-data.ts:333) promises four tiers. Checked the actual schema and every clinic-related file in the repo: today there is **only** a lead-capture form (`clinic_leads` table, [clinic-lead-form.tsx](../../src/components/poshan/clinic-lead-form.tsx)) behind all four. Nothing else exists — no patient-clinician linking, no lab data model, no plan drafting, no approval workflow. The `CLINIC_ROADMAP` array used to say "lab reports are entered by hand or CSV today" as present-tense fact; that was wrong and has been corrected in this session (poshan-data.ts:410) to honestly say the platform isn't built yet.

Practitioner is the right first slice because every other tier is Practitioner-plus: Clinic adds multi-seat RBAC and shared patient lists on top of the same patient-link and lab-value model; Hospital adds departments, PO billing and audit export on top of Clinic; Enterprise adds SSO/HL7-FHIR/ABDM on top of Hospital. Building Practitioner correctly means every later tier is additive, not a rewrite.

## What already exists and this design leans on — do not rebuild these

| Need | Existing code | Notes |
|---|---|---|
| Per-condition dish safety verdicts | `checkMeal` / `checkMealAll` in [conditions.ts](../../src/lib/conditions.ts:540) | This **is** "the 11-condition safety checker" the Practitioner tier promises. It already checks a meal id against a condition and returns `good`/`caution`/`avoid` with a reason. Phase 1 needs to *call* this for every dish in a drafted care plan, not reinvent it. |
| The 11 condition keys | `user_conditions` table (schema.sql:55), `CONDITIONS` in conditions.ts | Same 11 values both places already: diabetes, hypertension, ckd, anaemia, hypothyroid, pcos, nafld, coeliac, dyslipidaemia, gout, lactose. |
| Meal data + portions | `MEAL_LIBRARY`, `buildPlan()` in poshan-data.ts | Care-plan drafting reuses `buildPlan(region, diet, goal, kcal)` — the same function the consumer BMI tool already uses — rather than a parallel clinical meal-selection algorithm. |
| BMI banding | `BANDS`, `bandFor()` in poshan-data.ts | Same bands, same thresholds, both surfaces. |
| Maintenance calories | `estimateMaintenanceKcal()` in energy-requirement.ts | If a patient's own profile has age/sex/activity_level/weight, reuse it instead of asking the clinician to re-derive it. |
| Subscription gating | `subscriptions` table already has `product` values `'practitioner'`, `'clinic'`, `'hospital'`, `'enterprise'` (schema.sql:112) | The billing side of "am I a paying clinician" already exists. Phase 1 adds the *role* side (is this auth.users row actually a registered clinician), which billing alone doesn't answer. |
| Bilingual content | `Bi` type, `useLang()`/`T()` | Patient-facing plan output must render in the patient's `profiles.lang`, same convention as the rest of the app. |
| RLS pattern | Every existing table | Deny-by-default, `(select auth.uid()) = user_id`, service-role-only for anything server-verified. Phase 1's tables follow this exactly — see below. |

## Data model (new tables)

Follows the exact conventions in [schema.sql](../../supabase/schema.sql): `create table if not exists public.X`, `gen_random_uuid()` ids, RLS enabled on every table with no exceptions, CHECK constraints for enums instead of lookup tables, comments explain *why* not *what*.

```sql
-- ------------------------------------------------------------- clinicians
-- A clinician is a distinct role on top of an existing auth.users row, not a
-- separate account system — the same person can be a Poshan Home subscriber
-- AND a clinician. Registration number is required at signup because every
-- care plan sign-off has to carry it (CLINIC_TIERS practitioner feature:
-- "Sign-off logged with your registration number and timestamp").
create table if not exists public.clinicians (
  id                    uuid primary key references auth.users(id) on delete cascade,
  full_name             text not null,
  registration_number   text not null,
  registration_council  text not null,  -- e.g. "Medical Council of India", state council name
  specialty             text,
  verified_at           timestamptz,    -- null until Poshan manually confirms the registration
  created_at            timestamptz default now()
);

alter table public.clinicians enable row level security;

create policy "read own clinician row"
  on public.clinicians for select
  to authenticated using ((select auth.uid()) = id);
-- No self-service insert/update policy. A row here is created only after
-- Poshan verifies the registration number by hand (Phase 1 has no
-- registration-council API integration) — service role writes it after that
-- manual check. Self-inserting "I am a doctor" with no verification is the
-- single most damaging trust failure this feature could have.

-- ---------------------------------------------------------- patient_links
-- The consent record. A clinician NEVER creates this row — only the patient
-- can, by redeeming an invite code the clinician gave them out of band (in
-- person, by phone). This is the one design choice everything else depends
-- on: "the patient grants you access and can revoke it any time" is a
-- promise on the pricing page, so the patient must be the only writer of
-- the grant, and the only one who can end it.
create table if not exists public.patient_links (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references auth.users(id) on delete cascade,
  clinician_id   uuid not null references public.clinicians(id) on delete cascade,
  status         text not null default 'active' check (status in ('active','revoked')),
  invited_by     uuid not null references public.clinicians(id),
  -- Single-use, time-limited invite code. The clinician generates it (out of
  -- band delivery — QR code, verbally, printed slip); the patient redeems it
  -- once. Never a persistent "clinician can add any patient by email".
  invite_code    text unique,
  invite_expires_at timestamptz,
  linked_at      timestamptz,           -- null until the patient redeems the code
  revoked_at     timestamptz,
  created_at     timestamptz default now(),
  unique (patient_id, clinician_id)
);

alter table public.patient_links enable row level security;

create policy "patient reads own links"
  on public.patient_links for select
  to authenticated using ((select auth.uid()) = patient_id);
create policy "clinician reads own patient links"
  on public.patient_links for select
  to authenticated using ((select auth.uid()) = clinician_id);
create policy "patient revokes own link"
  on public.patient_links for update
  to authenticated
  using ((select auth.uid()) = patient_id)
  with check ((select auth.uid()) = patient_id and status = 'revoked');
-- Insert and the initial "redeem" transition happen server-side via a
-- dedicated API route (not a direct client insert): redeeming a code has to
-- validate expiry and single-use atomically, which a client-side RLS insert
-- policy cannot safely enforce alone.

-- --------------------------------------------------------------- lab_values
create table if not exists public.lab_values (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references auth.users(id) on delete cascade,
  entered_by     uuid not null references public.clinicians(id),
  marker         text not null check (marker in
                   ('hba1c','creatinine','egfr','haemoglobin','ldl','hdl','triglycerides')),
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
      where patient_id = lab_values.patient_id
        and clinician_id = (select auth.uid())
        and status = 'active'
    )
  );
create policy "linked clinician inserts patient labs"
  on public.lab_values for insert
  to authenticated with check (
    entered_by = (select auth.uid())
    and exists (
      select 1 from public.patient_links
      where patient_id = lab_values.patient_id
        and clinician_id = (select auth.uid())
        and status = 'active'
    )
  );
-- No update/delete: a lab value is a historical record. A correction is a
-- new row with a later taken_on/created_at, same principle as
-- biomarker_readings never being edited in place today.

-- --------------------------------------------------------------- care_plans
create table if not exists public.care_plans (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references auth.users(id) on delete cascade,
  clinician_id      uuid not null references public.clinicians(id),
  based_on_lab_ids  uuid[] not null default '{}',
  -- The drafted plan: dish ids + portions, same shape buildPlan() already
  -- returns, so the patient-facing renderer is the existing Plan renderer,
  -- not a new one.
  plan_json         jsonb not null,
  -- Populated by running checkMealAll() against every dish in plan_json for
  -- every condition in the patient's user_conditions, at draft time. Stored,
  -- not recomputed on every read, so an approved plan's safety check is a
  -- permanent record of what the clinician actually saw when they signed.
  safety_flags      jsonb not null default '[]',
  status            text not null default 'draft'
                      check (status in ('draft','approved','sent')),
  -- Sign-off. Both populated together, only on the draft -> approved
  -- transition, snapshotting the clinician's registration number as it was
  -- at approval time (not a live join to clinicians.registration_number,
  -- which could change later and silently rewrite history).
  approved_at              timestamptz,
  approved_by_reg_number   text,
  opened_by_patient_at     timestamptz,   -- adherence signal, Clinic-tier feature, cheap to add now
  created_at        timestamptz default now()
);

alter table public.care_plans enable row level security;

create policy "patient reads own approved plans"
  on public.care_plans for select
  to authenticated using ((select auth.uid()) = patient_id and status in ('approved','sent'));
create policy "clinician reads own drafted plans"
  on public.care_plans for select
  to authenticated using ((select auth.uid()) = clinician_id);
create policy "clinician inserts drafts for linked patients"
  on public.care_plans for insert
  to authenticated with check (
    clinician_id = (select auth.uid())
    and exists (
      select 1 from public.patient_links
      where patient_id = care_plans.patient_id
        and clinician_id = (select auth.uid())
        and status = 'active'
    )
  );
create policy "clinician approves own drafts"
  on public.care_plans for update
  to authenticated
  using ((select auth.uid()) = clinician_id and status = 'draft')
  with check ((select auth.uid()) = clinician_id and status = 'approved');
-- Deliberately no policy letting a patient see a DRAFT plan. "You approve
-- every plan before the patient ever sees it" is a pricing-page promise;
-- the RLS predicate above is what actually enforces it, not just UI that
-- happens not to show drafts.
```

## Critical design decision: the invite/link flow

This is the one piece worth over-explaining because getting it wrong is a real privacy incident, not a bug ticket.

1. Clinician (signed in, has a `clinicians` row) generates an invite: server route creates a `patient_links` row with `status='active'` is **wrong** — status must start effectively pending. Correction to the table above for implementation: add `'pending'` to the status check constraint, insert starts `status='pending', linked_at=null`, and only the patient's redeem action sets `status='active', linked_at=now()`. (Flagging here rather than silently fixing the SQL above, since it's the kind of detail that's easy to get subtly wrong twice.)
2. The invite code is short-lived (suggest 24h) and single-use (`unique` on the code, cleared/nulled after redemption so it can't be reused).
3. Clinician delivers the code out-of-band — printed, shown on their own screen, read aloud. **Never emailed by Poshan on the clinician's behalf** — that would let a clinician "invite" an email address without the person's active participation, which defeats the whole consent model.
4. Patient redeems it from their own signed-in Poshan account, via a dedicated route (not raw client insert) that validates expiry + single-use atomically and flips the row to `active`.
5. Patient can revoke at any time from their own account — a plain UI action hitting the `update` policy above. Revocation must also be checked live in the `lab_values`/`care_plans` RLS policies (already written that way above — `status = 'active'` is in every clinician-facing policy's `exists` clause), so revoking access takes effect immediately on the next query, not just in the UI.

## Explicit non-goals for Phase 1

- Multi-clinician / Clinic-tier shared patient lists and per-seat RBAC — needs a `clinics` table and a join model this design doesn't add yet.
- CSV bulk lab upload — Phase 1 is hand-entry only; CSV parsing is additive later, same `lab_values` table.
- PDF export of patient history — a rendering feature on top of data that will already exist; not a data-model change.
- Audit trail beyond what's already implicit in `created_at`/`approved_at` timestamps — Hospital tier's "full audit trail: who read what" needs an actual append-only read-log table, deliberately not built until there's a paying Hospital customer to build it for.
- ABDM/ABHA, HL7-FHIR, SSO — these need real external certification/partnership work regardless of code, out of scope for any phase of *this* plan.

## Build sequence

1. This schema, as a migration under `supabase/migrations/`, matching the naming convention already in use (`20260903_add_*.sql`). Includes fixing the `pending`/`active` status flagged above.
2. Server-side routes: generate invite, redeem invite, revoke link — all service-role-gated where the RLS policies alone aren't enough to safely enforce atomicity (invite redemption).
3. Clinician-side UI: a `/clinician` route gated on having a `clinicians` row AND an active `practitioner`+ subscription — patient list, lab entry form, plan drafting (calls `buildPlan()` + `checkMealAll()`), approve/sign action.
4. Patient-side UI: accept/manage links from their own account settings, view an approved plan (reuses the existing plan renderer).
5. The manual clinician-verification step (Poshan confirms the registration number before writing the `clinicians` row) is a support-team workflow, not a UI — needs at minimum an admin action or a direct SQL insert per verified clinician until volume justifies building an admin panel.

## Verification

No feel-check here (this is a backend/data-model plan, not motion) — the bar is: every new RLS policy tested from both sides (as the patient, as the linked clinician, as an *unlinked* clinician who must get zero rows back) before any UI is built on top of it, per the "SECURITY NOTE" at the top of schema.sql.

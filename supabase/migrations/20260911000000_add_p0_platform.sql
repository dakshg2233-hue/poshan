-- P0 platform: consent scopes, universal access logging, scan corrections
-- and the health timeline.
--
-- Same conventions as every migration before it: RLS on and deny-by-default
-- on each new table, policies scoped to (select auth.uid()), CHECK
-- constraints instead of lookup tables, and service-role writes for
-- anything a client must not be able to assert about itself.

-- ================================================================
-- 1. audit_log becomes universal, and patient-readable
-- ================================================================
-- Previously audit rows were written only for clinics that had at least one
-- department — correct while "full audit trail" was a Hospital-tier selling
-- point, wrong the moment the same rows became the patient's own answer to
-- "who opened my health data?". A privacy promise cannot be tier-gated: a
-- solo practitioner's patient has exactly the same right to that answer as a
-- hospital's. Two changes make that possible.

-- clinic_id was `not null references clinics` — a solo Practitioner belongs
-- to no clinic, so a row simply could not be written for one. Nullable now:
-- null means "acting as an individual practitioner, not on behalf of a
-- clinic", which is a real distinction worth keeping rather than inventing
-- a synthetic one-person clinic to satisfy the constraint.
alter table public.audit_log
  alter column clinic_id drop not null;

-- The existing check listed seven actions; 'read_adherence' was already
-- being passed by lib/audit-log.ts and would have failed the constraint had
-- a row ever reached it. Two more are added for the screens below.
alter table public.audit_log
  drop constraint if exists audit_log_action_check;
alter table public.audit_log
  add constraint audit_log_action_check check (action in (
    'read_patient_list', 'read_labs', 'read_plan',
    'add_lab', 'draft_plan', 'approve_plan', 'export_pdf',
    'read_adherence', 'read_timeline', 'read_summary'
  ));

-- The Privacy Center's entire data source. Note this is a *patient* read of
-- rows about themselves, which is a different axis from the existing clinic
-- admin policy — both can coexist, and a row is visible to the patient it
-- concerns and to the admin of the clinic that produced it, nobody else.
create policy "patient reads access log about self"
  on public.audit_log for select
  to authenticated using ((select auth.uid()) = patient_id);

create index if not exists idx_audit_log_patient
  on public.audit_log(patient_id, created_at desc);

-- ================================================================
-- 2. patient_links gains real consent semantics
-- ================================================================
-- Until now a link was binary: active or not, forever. "The patient grants
-- you access and can revoke it any time" was true but coarse — the patient
-- could not say *what* was shared, *why*, or *for how long*. DPDP Act 2023
-- expects purpose limitation and a defined retention window, and ABDM's
-- consent artefact carries exactly these three fields, so modelling them
-- now is also what makes a later ABDM mapping a translation rather than a
-- redesign.

alter table public.patient_links
  -- Which categories of data this grant covers. Deliberately an array of
  -- checked values rather than seven booleans: the set will grow (imaging,
  -- prescriptions, discharge summaries) and adding an enum member is a
  -- smaller change than adding a column.
  add column if not exists scopes text[] not null default '{labs,nutrition}',
  -- Free text, shown to the patient at grant time and stored verbatim.
  -- Not checked against a list: "nutrition consultation for gestational
  -- diabetes" is more useful to a patient reviewing their grants later
  -- than a dropdown value would be.
  add column if not exists purpose text,
  -- When access lapses on its own. Distinct from invite_expires_at, which
  -- governs the single-use *code* rather than the resulting access — the
  -- two were conflated before and only the former existed.
  add column if not exists access_expires_at timestamptz;

-- Every element must be a known scope. A bare text[] would let a client
-- write scopes:'{everything}' and have the UI render it as though granted.
alter table public.patient_links
  drop constraint if exists patient_links_scopes_known;
alter table public.patient_links
  add constraint patient_links_scopes_known check (
    scopes <@ array['labs','nutrition','conditions','medications','mental_health','weight','symptoms']::text[]
  );

comment on column public.patient_links.access_expires_at is
  'Null means no expiry was set at grant time. Enforced in checkConsent() (lib/consent.ts), not by a scheduled job: a lapsed row stays visible in the patient''s Privacy Center as history rather than vanishing, and a background job that deleted it would destroy exactly the record the patient may want to audit.';

-- The existing "patient revokes own link" policy allows exactly one
-- transition — active -> revoked — which was the whole vocabulary of
-- consent before scopes existed. Narrowing a grant, or changing when it
-- lapses, keeps status at 'active' and so is refused by that policy's
-- WITH CHECK. This second policy covers those edits.
--
-- It cannot itself enforce "narrowing only": a policy sees the proposed row
-- but comparing it element-by-element against the existing array is not
-- something a WITH CHECK expresses well. That rule lives in the route
-- (/api/privacy/consent), which filters the incoming scopes against the
-- current ones before writing. What this policy guarantees is the part that
-- matters for safety — only the patient the row is about can edit it at
-- all, and they can never use this path to resurrect a revoked link.
create policy "patient edits own consent terms"
  on public.patient_links for update
  to authenticated
  using ((select auth.uid()) = patient_id and status = 'active')
  with check ((select auth.uid()) = patient_id and status = 'active');

-- ================================================================
-- 3. scan_corrections — the training set nobody else has
-- ================================================================
-- Every time a user fixes the scanner ("that was 3 rotis, not 2"), that
-- correction is a human-labelled example of Indian food at a real portion,
-- photographed in a real kitchen. Stored from the first scan even though
-- nothing consumes it yet: this data cannot be backfilled later, and a year
-- of it is worth more than any model choice made today.
create table if not exists public.scan_corrections (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  -- What the model said, before the user touched it.
  predicted_dish_id text,
  predicted_qty     numeric,
  predicted_conf    text check (predicted_conf in ('high','medium','low')),
  -- What the user said it actually was. dish_id null = "this dish was not
  -- on my plate at all", which is a false positive and the most valuable
  -- correction of the three kinds.
  actual_dish_id    text,
  actual_qty        numeric,
  -- 'removed' (model hallucinated it), 'added' (model missed it),
  -- 'requantified' (right dish, wrong amount), 'confirmed' (model was
  -- right — kept, because a training set of only corrections is biased).
  kind              text not null check (kind in ('removed','added','requantified','confirmed')),
  created_at        timestamptz default now()
);

alter table public.scan_corrections enable row level security;

create policy "read own scan corrections"
  on public.scan_corrections for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own scan corrections"
  on public.scan_corrections for insert
  to authenticated with check ((select auth.uid()) = user_id);
-- No update or delete policy: a correction is an observation of what
-- happened at a moment, not a mutable record.

create index if not exists idx_scan_corrections_user
  on public.scan_corrections(user_id, created_at desc);

-- ================================================================
-- 4. timeline_events — one health history, many sources
-- ================================================================
-- Deliberately a thin index over data that already lives in its own table,
-- not a copy of it. A lab result stays the row in lab_values; this table
-- records only that something happened, when, and where to look. Copying
-- the values here would create two sources of truth for a number a doctor
-- may act on, and they would drift.
create table if not exists public.timeline_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  occurred_on   date not null,
  kind          text not null check (kind in (
                  'lab','plan','weight','consultation','condition',
                  'streak','scan','symptom'
                )),
  -- Short human label, already localised at write time. Bilingual pairs
  -- are stored as {"en":"…","hi":"…"} in `detail` when the source has
  -- both; `title` is the fallback for sources that don't.
  title         text not null,
  detail        jsonb,
  -- Which row in which table this points at, for the "open it" tap. Not a
  -- foreign key: the target lives in one of six tables and a polymorphic
  -- FK would need six nullable columns to express.
  source_table  text,
  source_id     uuid,
  created_at    timestamptz default now()
);

alter table public.timeline_events enable row level security;

create policy "read own timeline"
  on public.timeline_events for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own timeline"
  on public.timeline_events for insert
  to authenticated with check ((select auth.uid()) = user_id);
-- Clinician reads go through the service role after a hasConsent() check,
-- so that a 'timeline' scope can gate them. An RLS policy here would have
-- to re-express the whole scope check in SQL and drift from lib/consent.ts.

create index if not exists idx_timeline_user_date
  on public.timeline_events(user_id, occurred_on desc);

-- One event per source row. Timeline writes happen alongside the write they
-- describe, and a retried request must not produce a doubled history.
create unique index if not exists idx_timeline_source_unique
  on public.timeline_events(user_id, source_table, source_id)
  where source_id is not null;

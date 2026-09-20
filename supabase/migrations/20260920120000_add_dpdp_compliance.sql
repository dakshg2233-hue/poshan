-- DPDP Act, 2023 compliance foundation.
--
-- The audit that prompted this found Poshan strong on *who else* can see a
-- user's data — RLS everywhere, scoped clinician grants, an audit log the
-- patient can read — and almost empty on the rights a Data Principal holds
-- against Poshan itself. Everything below is that second half: proof of
-- consent, an age gate, erasure, retention, and nomination.
--
-- Nothing here is a policy document. Each table exists because a specific
-- section of the Act requires the Fiduciary to be able to *demonstrate*
-- something, and a claim you cannot produce a row for is a claim you
-- cannot make to the Board.


-- ============================================================ age (s.9)
--
-- s.9 turns on whether the Data Principal is under 18. Poshan already
-- stored `age`, but a self-declared integer captured once at onboarding is
-- wrong from the following birthday onwards — a 17-year-old stays 17 in
-- the row forever, which is backwards from the direction that matters:
-- they age *out* of s.9 and the row never notices.
--
-- date_of_birth is therefore the authoritative field from here on. `age`
-- is left in place because energy-requirement.ts reads it, and a nutrition
-- calculation is not the place to discover a schema change. is_minor()
-- prefers the date and falls back to the integer, so existing rows keep
-- working without a backfill.
alter table public.profiles
  add column if not exists date_of_birth date;

comment on column public.profiles.date_of_birth is
  'Authoritative age source for DPDP s.9. Prefer over `age`, which is a '
  'stale self-declaration on older rows. Null means "never asked" — treat '
  'as unknown, not as adult.';

-- s.14 — the right to nominate someone to exercise these rights on the
-- Data Principal's behalf in the event of death or incapacity. Three
-- columns rather than a table: the Act contemplates a nominee, not a list.
alter table public.profiles
  add column if not exists nominee_name text,
  add column if not exists nominee_email text,
  add column if not exists nominee_relationship text,
  add column if not exists nominee_updated_at timestamptz;

comment on column public.profiles.nominee_name is
  'DPDP s.14 nomination. Set together with nominee_email; the application '
  'treats a nomination as present only when both are non-null.';


/**
 * Is this account a child under s.9?
 *
 * Returns null — not false — when neither date_of_birth nor age is known.
 * The distinction matters: "we have not asked" is not "they are an adult",
 * and every caller must decide deliberately what to do with unknown rather
 * than inheriting a false that quietly permits processing.
 */
create or replace function public.is_minor(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select case
    when p.date_of_birth is not null
      then (p.date_of_birth > (current_date - interval '18 years')::date)
    when p.age is not null
      then (p.age < 18)
    else null
  end
  from public.profiles p
  where p.id = p_user_id;
$fn$;


-- ================================================= consent ledger (s.6)
--
-- The Fiduciary carries the burden of proving consent was given, for what,
-- under which notice, and when. Before this, the only record of a cookie
-- choice was a localStorage key on the user's own device — user-clearable,
-- never transmitted, and therefore not evidence of anything.
--
-- Append-only by policy: a withdrawal writes a new row rather than
-- updating the old one, so the ledger reads as a history instead of a
-- current state. There is no update policy, and that is deliberate.
create table if not exists public.consent_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,

  -- Null user_id is allowed: the cookie banner is answered before anyone
  -- signs in. Those rows are keyed by anon_id instead, and adopted into an
  -- account later if the visitor creates one.
  anon_id         text,

  purpose         text not null check (purpose in (
                    'account_and_health_data',
                    'analytics_cookies',
                    'clinician_sharing',
                    'family_member_data',
                    'marketing_email'
                  )),
  granted         boolean not null,

  -- Which words the person actually agreed to. A consent record that does
  -- not pin the notice version cannot answer "what were they told?", which
  -- is the only question that matters in a dispute.
  notice_version  text not null,
  notice_lang     text not null default 'en' check (notice_lang in ('en','hi')),

  -- s.6(1) requires a clear affirmative action. Recording which one it was
  -- distinguishes a ticked box from a consent inferred after the fact.
  method          text not null default 'explicit_click',

  created_at      timestamptz not null default now(),

  constraint consent_subject_present
    check (user_id is not null or anon_id is not null)
);

create index if not exists consent_records_user_idx
  on public.consent_records (user_id, purpose, created_at desc);
create index if not exists consent_records_anon_idx
  on public.consent_records (anon_id, purpose, created_at desc)
  where anon_id is not null;

alter table public.consent_records enable row level security;

drop policy if exists "read own consent records" on public.consent_records;
create policy "read own consent records"
  on public.consent_records for select
  using (auth.uid() = user_id);

drop policy if exists "insert own consent records" on public.consent_records;
create policy "insert own consent records"
  on public.consent_records for insert
  with check (auth.uid() = user_id or user_id is null);

-- No update or delete policy anywhere, on purpose. The ledger is evidence,
-- and evidence the subject of it can rewrite is not evidence. These rows
-- are erased through the auth.users cascade when the account goes, which
-- is the only path that should remove them.


/**
 * The live answer for one purpose: the most recent row wins.
 *
 * Callers ask this rather than reading the table directly, so "consent is
 * the latest record, and absence means no" is stated once here instead of
 * being re-derived correctly in some routes and incorrectly in others.
 */
create or replace function public.has_consent(p_user_id uuid, p_purpose text)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(
    (select granted
       from public.consent_records
      where user_id = p_user_id
        and purpose = p_purpose
      order by created_at desc
      limit 1),
    false
  );
$fn$;


-- ========================================== parental consent (s.9(1))
--
-- "Verifiable" is the load-bearing word. A checkbox saying "I am a parent"
-- verifies nothing, so this records an actual round trip: Poshan emails
-- the guardian a token, the guardian follows it and confirms, and only the
-- confirmation — never the claim — sets verified_at.
--
-- This is the floor, not the ceiling. The Rules contemplate stronger
-- verification (a DigiLocker-issued credential, or a token from a
-- registered Consent Manager), so verification_method is an enum with room
-- rather than a boolean: a stronger method can be adopted without a
-- migration, and old rows stay honest about which method they used.
create table if not exists public.parental_consents (
  id                    uuid primary key default gen_random_uuid(),

  -- Exactly one of these two: a minor who holds their own account, or a
  -- child recorded as somebody else's family member.
  minor_user_id         uuid references auth.users(id) on delete cascade,
  family_member_id      uuid references public.family_members(id) on delete cascade,

  guardian_name         text not null,
  guardian_email        text not null,
  guardian_phone        text,
  guardian_relationship text not null,

  verification_method   text not null default 'email_token'
                          check (verification_method in (
                            'email_token', 'digilocker', 'consent_manager'
                          )),
  verification_token    text,
  token_expires_at      timestamptz,

  -- Null until the guardian completes the round trip. Every read path
  -- treats null as "not consented".
  verified_at           timestamptz,
  revoked_at            timestamptz,

  notice_version        text not null,
  notice_lang           text not null default 'en' check (notice_lang in ('en','hi')),

  created_at            timestamptz not null default now(),

  constraint parental_consent_subject_present
    check (num_nonnulls(minor_user_id, family_member_id) = 1)
);

create unique index if not exists parental_consents_token_idx
  on public.parental_consents (verification_token)
  where verification_token is not null;

create index if not exists parental_consents_minor_idx
  on public.parental_consents (minor_user_id) where minor_user_id is not null;
create index if not exists parental_consents_family_idx
  on public.parental_consents (family_member_id) where family_member_id is not null;

alter table public.parental_consents enable row level security;

drop policy if exists "read own parental consent" on public.parental_consents;
create policy "read own parental consent"
  on public.parental_consents for select
  using (
    auth.uid() = minor_user_id
    or exists (
      select 1 from public.family_members fm
       where fm.id = parental_consents.family_member_id
         and fm.account_id = auth.uid()
    )
  );

drop policy if exists "create own parental consent" on public.parental_consents;
create policy "create own parental consent"
  on public.parental_consents for insert
  with check (
    auth.uid() = minor_user_id
    or exists (
      select 1 from public.family_members fm
       where fm.id = parental_consents.family_member_id
         and fm.account_id = auth.uid()
    )
  );

-- Verification is written by the service role from the token endpoint, not
-- by the account holder. Letting the subject of a check mark their own
-- check as passed would defeat the point of having one.


/**
 * May this child's data be processed right now?
 *
 * Fails closed in every uncertain case — no row, unverified, revoked —
 * because a read that should have been blocked is worse than a read that
 * fails. Same principle as checkConsent() in consent.ts.
 *
 * Note the parenthesisation of the subject match. Without it, AND binding
 * tighter than OR would attach the verified_at and revoked_at tests to the
 * family-member branch alone, and any row naming a minor_user_id would
 * satisfy this function whether or not a guardian had ever confirmed it.
 */
create or replace function public.has_parental_consent(
  p_minor_user_id uuid,
  p_family_member_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
      from public.parental_consents pc
     where (
             (p_minor_user_id is not null and pc.minor_user_id = p_minor_user_id)
             or (p_family_member_id is not null and pc.family_member_id = p_family_member_id)
           )
       and pc.verified_at is not null
       and pc.revoked_at is null
  );
$fn$;


-- ============================================ family members (s.5, s.9)
--
-- Every family member is a Data Principal in their own right — a person
-- whose name, age, height, weight and dietary conditions are processed on
-- somebody else's say-so. The Act has no exception for "my spouse entered
-- it".
--
-- Poshan cannot serve a notice to someone who has no account, so the
-- honest intermediate step is to make the account holder assert, on the
-- record, that they have the standing to provide this data and have told
-- the person. That assertion is a row, not a vibe.
alter table public.family_members
  add column if not exists notice_ack_at timestamptz,
  add column if not exists notice_ack_basis text;

do $mig$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'family_members_notice_basis_check'
  ) then
    alter table public.family_members
      add constraint family_members_notice_basis_check
      check (notice_ack_basis is null or notice_ack_basis in (
        'self_declared_guardian', 'informed_adult'
      ));
  end if;
end
$mig$;

comment on column public.family_members.notice_ack_basis is
  'Why the account holder may provide this person''s data: as their '
  'guardian (a child, which also requires a verified parental_consents '
  'row) or as an adult who has been told. Null on rows created before '
  'this migration — those are the backfill queue.';


-- ====================================== erasure (s.8(7), s.12(3))
--
-- Deletion itself is a cascade from auth.users, which already existed.
-- What did not exist was any record that a request was made and honoured —
-- the thing a grievance or a Board inquiry asks for, and the one piece of
-- evidence that by definition cannot live in the deleted account's own
-- rows.
--
-- Holds no personal data beyond the email needed to confirm completion, so
-- that the record of an erasure does not itself defeat the erasure.
create table if not exists public.deletion_requests (
  id                uuid primary key default gen_random_uuid(),

  -- Not a foreign key: the row must outlive the user it refers to.
  user_id           uuid not null,
  requested_email   text,

  requested_at      timestamptz not null default now(),
  completed_at      timestamptz,
  status            text not null default 'pending'
                      check (status in ('pending','completed','failed')),
  failure_reason    text,

  -- What was removed, for the completion record. Counts only, never content.
  tables_cleared    jsonb,
  storage_cleared   integer
);

create index if not exists deletion_requests_user_idx
  on public.deletion_requests (user_id, requested_at desc);

alter table public.deletion_requests enable row level security;

-- Deliberately no policies: written and read by the service role only. The
-- user who owns the row is, moments later, gone — there is nobody left to
-- grant a policy to.


-- ============================================== retention (s.8(7))
--
-- Personal data must be erased once the purpose it was collected for is no
-- longer served. Poshan had no expiry on anything except family invites
-- and clinician grants, so chat transcripts carrying health context
-- accumulated for the life of the account.
--
-- These windows are a starting position, not a legal conclusion: they are
-- the shortest spans that still serve the stated product purpose. Once
-- confirmed they belong in the privacy policy verbatim, because a
-- retention period users cannot read is not a retention policy.
create table if not exists public.retention_policy (
  table_name    text primary key,
  retain_days   integer not null check (retain_days > 0),
  date_column   text not null,
  rationale     text not null
);

insert into public.retention_policy (table_name, retain_days, date_column, rationale) values
  ('chat_messages', 180, 'created_at',
   'Conversation history exists to give the assistant context within a '
   'course of questions, not to build a permanent health record. Six '
   'months covers a season of eating; past that it is only risk.'),
  ('rate_limits', 7, 'created_at',
   'Abuse counters. Useful for days, meaningless for months.'),
  ('webhook_events', 90, 'created_at',
   'Payment idempotency keys. Ninety days comfortably outlives any retry '
   'window a gateway will attempt.'),
  ('scan_corrections', 365, 'created_at',
   'Model-improvement signal. A year of corrections is ample to measure '
   'drift without holding a multi-year log of what someone ate.')
on conflict (table_name) do nothing;

alter table public.retention_policy enable row level security;
-- No policies: operator configuration, read by the service role.


/**
 * Delete everything past its retention window.
 *
 * Driven by the table above rather than hard-coded here, so changing a
 * window is a data change reviewable in one place instead of an edit
 * buried in a function body.
 *
 * Schedule with pg_cron once the extension is enabled on the project:
 *   select cron.schedule('poshan-retention', '0 3 * * *',
 *                        'select public.apply_retention()');
 */
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
begin
  for rec in select table_name, retain_days, date_column from public.retention_policy loop
    execute format(
      'delete from public.%I where %I < now() - ($1::text || '' days'')::interval',
      rec.table_name, rec.date_column
    ) using rec.retain_days;
    get diagnostics removed = row_count;
    result := result || jsonb_build_object(rec.table_name, removed);
  end loop;
  return result;
end;
$fn$;

revoke all on function public.apply_retention() from public, anon, authenticated;

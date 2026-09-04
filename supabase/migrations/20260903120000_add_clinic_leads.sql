-- Hospital and Enterprise are deliberately not self-serve (PO/invoice, not
-- card) — see CLINIC_TIERS in poshan-data.ts. Their "Talk to us" CTA used to
-- link to /login, which makes no sense for a procurement conversation. This
-- table backs a real contact form instead.
create table if not exists public.clinic_leads (
  id          uuid primary key default gen_random_uuid(),
  tier        text not null check (tier in ('hospital','enterprise')),
  name        text not null,
  org         text not null,
  email       text not null,
  phone       text,
  message     text,
  created_at  timestamptz default now()
);

alter table public.clinic_leads enable row level security;
-- No select/insert/update policy for anon or authenticated: a visitor
-- submitting this form is very often signed out, and even a signed-in one
-- must never be able to read another lead's submission. Written only by the
-- API route via the service-role key, which bypasses RLS.

-- Both chatbots ("Ask Poshan" for food/nutrition, "Health Companion" for
-- condition-focused guidance) share this table: one shared daily message
-- pool across both, one history store, one place to enforce the free-tier
-- limit. `chatbot` distinguishes which persona a row belongs to; the daily
-- count itself is taken across both when checking the free-tier quota.
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  chatbot    text not null check (chatbot in ('nutrition','health')),
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz default now()
);

alter table public.chat_messages enable row level security;

create policy "read own chat history"
  on public.chat_messages for select
  to authenticated using ((select auth.uid()) = user_id);
-- No insert/update/delete policy: written only by the API route via the
-- service-role key, so the daily quota can't be bypassed by writing rows
-- directly and so a message can't be attributed to another user's account.

create index if not exists idx_chat_messages_user_day
  on public.chat_messages(user_id, chatbot, created_at desc);

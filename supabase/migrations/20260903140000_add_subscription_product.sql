-- `plan` on subscriptions only ever encoded billing cycle (monthly/yearly),
-- with no column for WHICH product a row is for. The app queried
-- `.eq("plan", "home")` — a value the old check constraint could never hold,
-- so that query could never match a row, ever. `product` adds the missing
-- axis without disturbing `plan`, which keeps its original meaning.
alter table public.subscriptions
  add column if not exists product text not null default 'home'
    check (product in ('home', 'practitioner', 'clinic', 'hospital', 'enterprise'));

create index if not exists idx_subs_user_product on public.subscriptions(user_id, product);

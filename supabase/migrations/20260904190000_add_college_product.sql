-- Poshan Plus for college students/hostellers: a single-profile SKU at
-- ₹999/year. It shares every premium gate with 'home' (dashboard, onboarding,
-- meals) except /api/family, which checks for 'home' specifically — that
-- omission is what caps the plan to one profile, not a separate column.
alter table public.subscriptions drop constraint if exists subscriptions_product_check;
alter table public.subscriptions
  add constraint subscriptions_product_check
    check (product in ('home', 'college', 'practitioner', 'clinic', 'hospital', 'enterprise'));

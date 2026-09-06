-- Portion-photo calibration: a per-person multiplier on standard portion
-- sizes, set once by photographing a bowl next to a ₹10 coin (see
-- src/app/api/portion-calibration/route.ts). 1.00 = MEAL_LIBRARY's
-- standard portions apply unchanged; nothing here changes which dish is
-- recommended, only how the displayed kcal total is annotated for this
-- specific person's actual bowl size.
alter table public.profiles
  add column if not exists portion_scale numeric(3, 2) not null default 1.00
    check (portion_scale between 0.50 and 2.00);

alter table public.family_members
  add column if not exists portion_scale numeric(3, 2) not null default 1.00
    check (portion_scale between 0.50 and 2.00);

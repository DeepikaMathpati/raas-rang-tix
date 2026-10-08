alter table public.referrals
  add column if not exists discount_individual_paise integer not null default 0,
  add column if not exists discount_squad_paise integer not null default 0;

update public.referrals
set
  discount_individual_paise = round(34900 * discount_percent / 100.0)::integer,
  discount_squad_paise = round(150000 * discount_percent / 100.0)::integer;

alter table public.referrals
  drop constraint if exists referrals_discount_amounts_range,
  add constraint referrals_discount_amounts_range
    check (
      discount_individual_paise between 0 and 34899
      and discount_squad_paise between 0 and 149999
    );

alter table public.bookings
  add column if not exists referral_discount_paise integer not null default 0;

update public.bookings
set referral_discount_paise = discount_amount_paise
where referral_code is not null;

alter table public.bookings
  drop constraint if exists bookings_referral_discount_paise_range,
  add constraint bookings_referral_discount_paise_range
    check (referral_discount_paise >= 0);

alter table public.referrals
  add column if not exists discount_percent smallint not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'referrals_discount_percent_range'
      and conrelid = 'public.referrals'::regclass
  ) then
    alter table public.referrals
      add constraint referrals_discount_percent_range
      check (discount_percent between 0 and 99);
  end if;
end;
$$;

alter table public.bookings
  add column if not exists referral_discount_percent smallint not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_referral_discount_percent_range'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_referral_discount_percent_range
      check (referral_discount_percent between 0 and 99);
  end if;
end;
$$;

alter table public.bookings
  add column if not exists base_amount_paise integer;

update public.bookings
set base_amount_paise = amount_paise
where base_amount_paise is null;

alter table public.bookings
  alter column base_amount_paise set not null,
  alter column base_amount_paise set default 0,
  add column if not exists discount_amount_paise integer not null default 0;

alter table public.bookings
  drop constraint if exists bookings_check,
  drop constraint if exists bookings_pass_rules,
  drop constraint if exists bookings_pass_pricing_rules;

alter table public.bookings
  add constraint bookings_pass_pricing_rules
  check (
    quantity = 1
    and amount_paise > 0
    and discount_amount_paise >= 0
    and referral_discount_percent between 0 and 99
    and base_amount_paise = amount_paise + discount_amount_paise
    and (
      (
        pass_type = 'individual'
        and attendee_count = 1
        and base_amount_paise between 1 and 34900
      )
      or
      (
        pass_type = 'squad'
        and attendee_count = 5
        and base_amount_paise between 1 and 150000
      )
    )
  );

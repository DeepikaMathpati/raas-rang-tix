-- Referral discounts apply only to one individual pass. The trigger is used
-- instead of validating a new check constraint so historical rows remain
-- untouched and can still receive unrelated updates.
alter table public.bookings
drop constraint if exists bookings_pass_rules;

create or replace function public.enforce_current_booking_price()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  booking_fields_changed boolean;
begin
  if tg_op = 'INSERT' then
    booking_fields_changed := true;
  else
    booking_fields_changed :=
      new.pass_type is distinct from old.pass_type
      or new.quantity is distinct from old.quantity
      or new.attendee_count is distinct from old.attendee_count
      or new.amount_paise is distinct from old.amount_paise
      or new.referral_code is distinct from old.referral_code;
  end if;

  if booking_fields_changed then
    if new.pass_type = 'individual'
      and new.quantity = 1
      and new.attendee_count = 1
      and (
        (new.amount_paise = 34900 and new.referral_code is null)
        or (
          new.amount_paise = 29900
          and new.referral_code is not null
          and exists (
            select 1
            from public.referrals
            where code = upper(trim(new.referral_code))
              and active = true
          )
        )
      ) then
      return new;
    end if;

    if new.pass_type = 'squad'
      and new.quantity = 1
      and new.attendee_count = 5
      and new.amount_paise = 150000
      and new.referral_code is null then
      return new;
    end if;

    raise exception 'Invalid booking amount or referral code for pass type';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_enforce_current_price on public.bookings;

create trigger bookings_enforce_current_price
before insert or update of pass_type, quantity, attendee_count, amount_paise, referral_code
on public.bookings
for each row
execute function public.enforce_current_booking_price();

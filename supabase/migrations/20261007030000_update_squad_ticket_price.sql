-- NOT VALID leaves historical booking rows untouched while enforcing the
-- restored prices for all new and updated rows.
alter table public.bookings
drop constraint if exists bookings_pass_rules;

alter table public.bookings
add constraint bookings_pass_rules
check (
  (
    pass_type = 'individual'
    and quantity = 1
    and attendee_count = 1
    and amount_paise = 34900
  )
  or
  (
    pass_type = 'squad'
    and quantity = 1
    and attendee_count = 5
    and amount_paise = 150000
  )
) not valid;

create or replace function public.enforce_current_booking_price()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
    or new.pass_type is distinct from old.pass_type
    or new.quantity is distinct from old.quantity
    or new.attendee_count is distinct from old.attendee_count
    or new.amount_paise is distinct from old.amount_paise then
    if not (
      (new.pass_type = 'individual' and new.quantity = 1
        and new.attendee_count = 1 and new.amount_paise = 34900)
      or (new.pass_type = 'squad' and new.quantity = 1
        and new.attendee_count = 5 and new.amount_paise = 150000)
    ) then
      raise exception 'Invalid booking amount for pass type';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_enforce_current_price on public.bookings;

create trigger bookings_enforce_current_price
before insert or update of pass_type, quantity, attendee_count, amount_paise
on public.bookings
for each row
execute function public.enforce_current_booking_price();

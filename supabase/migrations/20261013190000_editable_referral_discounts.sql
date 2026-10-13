create or replace function public.enforce_current_booking_price()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  expected_base_paise integer;
  expected_discount_paise integer := 0;
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
      or new.referral_code is distinct from old.referral_code
      or new.base_amount_paise is distinct from old.base_amount_paise
      or new.discount_amount_paise is distinct from old.discount_amount_paise
      or new.referral_discount_paise is distinct from old.referral_discount_paise;
  end if;

  if not booking_fields_changed then
    return new;
  end if;

  if new.pass_type = 'individual' and new.quantity = 1 and new.attendee_count = 1 then
    expected_base_paise := 34900;
  elsif new.pass_type = 'squad' and new.quantity = 1 and new.attendee_count = 5 then
    expected_base_paise := 150000;
  else
    raise exception 'Invalid booking amount or referral code for pass type';
  end if;

  if new.referral_code is not null then
    select case new.pass_type
      when 'individual' then discount_individual_paise
      when 'squad' then discount_squad_paise
    end
    into expected_discount_paise
    from public.referrals
    where code = upper(trim(new.referral_code))
      and active = true;

    if not found then
      raise exception 'Invalid booking amount or referral code for pass type';
    end if;
  end if;

  if new.base_amount_paise is distinct from expected_base_paise
    or new.discount_amount_paise is distinct from expected_discount_paise
    or new.referral_discount_paise is distinct from expected_discount_paise
    or new.amount_paise is distinct from expected_base_paise - expected_discount_paise then
    raise exception 'Invalid booking amount or referral code for pass type';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_enforce_current_price on public.bookings;

create trigger bookings_enforce_current_price
before insert or update of
  pass_type,
  quantity,
  attendee_count,
  amount_paise,
  referral_code,
  base_amount_paise,
  discount_amount_paise,
  referral_discount_paise
on public.bookings
for each row
execute function public.enforce_current_booking_price();

alter table public.bookings
  add column if not exists access_token text;

update public.bookings
set access_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
where access_token is null;

alter table public.bookings
  alter column access_token set not null;

create unique index if not exists bookings_access_token_key
  on public.bookings (access_token);

create type public.app_role as enum ('admin','staff');
create type public.pass_type as enum ('individual','squad');
create type public.payment_status as enum ('pending','paid','failed','refunded');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  mobile text not null check (mobile ~ '^[6-9][0-9]{9}$'),
  email text not null check (char_length(email) <= 255),
  event_date date not null check (event_date in ('2026-10-16','2026-10-17','2026-10-18')),
  pass_type pass_type not null,
  quantity int not null check (quantity between 1 and 10),
  attendee_count int not null,
  amount_paise int not null check (amount_paise > 0),
  payment_status payment_status not null default 'pending',
  razorpay_order_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  check ((pass_type = 'individual' and attendee_count = quantity and amount_paise = quantity * 34900)
      or (pass_type = 'squad' and attendee_count = quantity * 5 and amount_paise = quantity * 150000))
);
create index on public.bookings (created_at desc);
create index on public.bookings (mobile);
grant select, update on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "Admins read bookings" on public.bookings for select to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));
create policy "Admins update bookings" on public.bookings for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  ticket_code text not null unique,
  attendee_index int not null,
  attendee_name text,
  event_date date not null,
  checked_in_at timestamptz,
  checked_in_by uuid,
  created_at timestamptz not null default now(),
  unique (booking_id, attendee_index)
);
grant select on public.tickets to authenticated;
grant all on public.tickets to service_role;
alter table public.tickets enable row level security;
create policy "Admins read tickets" on public.tickets for select to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider text not null default 'razorpay',
  razorpay_order_id text not null,
  razorpay_payment_id text unique,
  amount_paise int not null,
  status payment_status not null default 'pending',
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "Admins read payments" on public.payments for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- Atomic check-in: only one success per ticket
create or replace function public.check_in_ticket(_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t public.tickets; b public.bookings;
begin
  if not (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff')) then
    raise exception 'forbidden';
  end if;
  select * into t from public.tickets where ticket_code = _code;
  if not found then return jsonb_build_object('result','not_found'); end if;
  select * into b from public.bookings where id = t.booking_id;
  if b.payment_status <> 'paid' then return jsonb_build_object('result','unpaid'); end if;
  update public.tickets set checked_in_at = now(), checked_in_by = auth.uid()
    where id = t.id and checked_in_at is null returning * into t;
  if not found then
    select * into t from public.tickets where ticket_code = _code;
    return jsonb_build_object('result','already_checked_in','checked_in_at',t.checked_in_at,'name',b.customer_name);
  end if;
  return jsonb_build_object('result','ok','name',b.customer_name,'event_date',t.event_date,'attendee_index',t.attendee_index,'booking_code',b.booking_code);
end $$;
revoke execute on function public.check_in_ticket(text) from public, anon;
grant execute on function public.check_in_ticket(text) to authenticated;
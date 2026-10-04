-- ============================================================
-- RAAS MAHOTSAV 2026
-- Attendee + one-QR-per-booking structure
-- ============================================================

-- ------------------------------------------------------------
-- 1. Attendees
-- ------------------------------------------------------------

create table public.attendees (
  id uuid primary key default gen_random_uuid(),

  booking_id uuid not null
    references public.bookings(id)
    on delete cascade,

  attendee_index int not null
    check (attendee_index >= 1),

  attendee_name text not null
    check (char_length(trim(attendee_name)) between 2 and 100),

  created_at timestamptz not null default now(),

  unique (booking_id, attendee_index)
);

create index attendees_booking_id_idx
  on public.attendees (booking_id);

grant select on public.attendees to authenticated;
grant all on public.attendees to service_role;

alter table public.attendees enable row level security;

-- Admin/staff can view attendee information.
create policy "Admins and staff read attendees"
on public.attendees
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'staff')
);


-- ------------------------------------------------------------
-- 2. Make squad bookings exactly one squad = five people
-- ------------------------------------------------------------

alter table public.bookings
drop constraint if exists bookings_check;

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
);


-- ------------------------------------------------------------
-- 3. One QR/ticket per booking
-- ------------------------------------------------------------

-- Every booking gets exactly one ticket/QR.
-- attendee_index is kept as 1 because the QR represents
-- the complete booking, not an individual attendee.

create unique index tickets_one_ticket_per_booking_idx
on public.tickets (booking_id);


-- ------------------------------------------------------------
-- 4. Replace check-in logic
-- ------------------------------------------------------------

create or replace function public.check_in_ticket(_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tickets;
  b public.bookings;
  member_names jsonb;
begin

  if not (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'staff')
  ) then
    raise exception 'forbidden';
  end if;

  select *
  into t
  from public.tickets
  where ticket_code = _code;

  if not found then
    return jsonb_build_object(
      'result', 'not_found'
    );
  end if;

  select *
  into b
  from public.bookings
  where id = t.booking_id;

  if b.payment_status <> 'paid' then
    return jsonb_build_object(
      'result', 'unpaid'
    );
  end if;

  select coalesce(
    jsonb_agg(
      a.attendee_name
      order by a.attendee_index
    ),
    '[]'::jsonb
  )
  into member_names
  from public.attendees a
  where a.booking_id = b.id;

  update public.tickets
  set
    checked_in_at = now(),
    checked_in_by = auth.uid()
  where id = t.id
    and checked_in_at is null
  returning *
  into t;

  if not found then
    select *
    into t
    from public.tickets
    where ticket_code = _code;

    return jsonb_build_object(
      'result', 'already_checked_in',
      'checked_in_at', t.checked_in_at,
      'name', b.customer_name,
      'attendee_count', b.attendee_count,
      'members', member_names
    );
  end if;

  return jsonb_build_object(
    'result', 'ok',
    'name', b.customer_name,
    'event_date', t.event_date,
    'attendee_count', b.attendee_count,
    'members', member_names,
    'booking_code', b.booking_code
  );

end;
$$;
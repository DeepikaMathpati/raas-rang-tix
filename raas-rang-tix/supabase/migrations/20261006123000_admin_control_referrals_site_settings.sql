-- ============================================================
-- RAAS MAHOTSAV 2026
-- Admin control center: referrals + editable public site settings
-- ============================================================

alter table public.bookings
  add column if not exists referral_code text;

create index if not exists bookings_referral_code_idx
  on public.bookings (referral_code);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{3,24}$'),
  name text not null check (char_length(trim(name)) between 2 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

grant select on public.referrals to authenticated;
grant all on public.referrals to service_role;
alter table public.referrals enable row level security;

drop policy if exists "Admins read referrals" on public.referrals;
create policy "Admins read referrals"
on public.referrals
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'staff')
);

drop policy if exists "Admins manage referrals" on public.referrals;
create policy "Admins manage referrals"
on public.referrals
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.site_settings (
  id text primary key default 'main',
  value jsonb not null,
  updated_at timestamptz not null default now(),
  check (id = 'main')
);

grant select on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;

drop policy if exists "Admins read site settings" on public.site_settings;
create policy "Admins read site settings"
on public.site_settings
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'staff')
);

drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Admins manage site settings"
on public.site_settings
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

insert into public.site_settings (id, value)
values (
  'main',
  jsonb_build_object(
    'tagline', 'Raas Rang Dhamaka',
    'time', '5 PM – 11 PM',
    'venueName', 'Royal Palace Function Hall',
    'venueAddress', 'Dhanwantri Hospital Road, Kootnoor, Kalaburagi, Karnataka 585102',
    'phone', '+91 9916977793',
    'coPartner', 'Blooming Minds International School, Kalaburagi',
    'announcement', '',
    'introText', 'Celebrate Navratri in Kalaburagi with three evenings of Dandiya and Garba, music, stalls and festive flavours — all under one roof at the Royal Palace Function Hall. Dress in your finest chaniya choli or kediyu and join the circle.',
    'highlights', jsonb_build_array(
      'Dandiya & Garba',
      'Music & Entertainment',
      'Shopping Stalls',
      'Gujarati Snacks',
      'Photo Booth',
      'Many More Exciting Stalls'
    )
  )
)
on conflict (id) do nothing;

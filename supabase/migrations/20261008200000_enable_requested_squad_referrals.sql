insert into public.referrals (
  code,
  name,
  active,
  discount_individual_paise,
  discount_squad_paise
)
values
  ('CHAL-JHOOTHI', 'CHAL-JHOOTHI', true, 5000, 5000),
  ('BHAI-SAAB', 'BHAI-SAAB', true, 5000, 5000)
on conflict (code) do update
set
  active = excluded.active,
  discount_individual_paise = excluded.discount_individual_paise,
  discount_squad_paise = excluded.discount_squad_paise;

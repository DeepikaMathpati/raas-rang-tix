update public.site_settings
set value = jsonb_set(
  coalesce(value, '{}'::jsonb),
  '{mapUrl}',
  to_jsonb('https://www.google.com/maps/place/Royal+palace+Function+hall/@17.2998627,76.8247469,17z/'::text),
  true
)
where id = 'main'
  and (
    value->>'mapUrl' is null
    or value->>'mapUrl' = 'https://maps.app.goo.gl/Wcbgg6gzdn8LSUNH7'
  );

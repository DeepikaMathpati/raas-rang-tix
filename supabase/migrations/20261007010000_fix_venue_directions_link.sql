update public.site_settings
set value = jsonb_set(
  coalesce(value, '{}'::jsonb),
  '{mapUrl}',
  to_jsonb('https://www.google.com/maps/dir/?api=1&destination=17.2998627%2C76.8247469'::text),
  true
)
where id = 'main'
  and value->>'mapUrl' in (
    'https://maps.app.goo.gl/Wcbgg6gzdn8LSUNH7',
    'https://maps.app.goo.gl/X5AKks7r3V4Ed6Vu8',
    'https://www.google.com/maps/place/Royal+palace+Function+hall/@17.2998627,76.8247469,17z/'
  );

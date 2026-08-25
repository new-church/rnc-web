-- Smoke-test member used by /dev/items-check.
-- Stable keys so the app can get() without guessing UUIDs.

insert into public.items (
  pk,
  sk,
  entity_type,
  data,
  gsi1pk,
  gsi1sk,
  gsi2pk,
  gsi2sk,
  expires_at
) values (
  'MEMBER#sample-ada',
  'PROFILE',
  'member',
  jsonb_build_object(
    'displayName', 'Ada Lovelace',
    'email', 'ada.sample@example.com',
    'note', 'Sample row from migration — safe to delete later.',
    'sample', true
  ),
  'EMAIL#ada.sample@example.com',
  'MEMBER',
  'DIR#rnc',
  'NAME#lovelace ada#sample-ada',
  null
)
on conflict (pk, sk) do update set
  entity_type = excluded.entity_type,
  data = excluded.data,
  gsi1pk = excluded.gsi1pk,
  gsi1sk = excluded.gsi1sk,
  gsi2pk = excluded.gsi2pk,
  gsi2sk = excluded.gsi2sk,
  expires_at = excluded.expires_at;

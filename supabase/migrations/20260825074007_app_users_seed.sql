-- App login identity (permissions). Separate from MEMBER# CRM sample rows.

insert into public.items (
  pk,
  sk,
  entity_type,
  data,
  gsi1pk,
  gsi1sk,
  gsi2pk,
  gsi2sk,
  gsi3pk,
  gsi3sk,
  expires_at
) values (
  'USER#joel@duckworth.me',
  'PROFILE',
  'user',
  jsonb_build_object(
    'email', 'joel@duckworth.me',
    'displayName', 'Joel',
    'scopes', jsonb_build_array('super_admin'),
    'authUserId', null,
    'createdAt', now(),
    'updatedAt', now()
  ),
  'EMAIL#joel@duckworth.me',
  'USER',
  'USERS#rnc',
  'EMAIL#joel@duckworth.me',
  null,
  null,
  null
)
on conflict (pk, sk) do update set
  entity_type = excluded.entity_type,
  data = jsonb_set(
    excluded.data || public.items.data,
    '{scopes}',
    coalesce(excluded.data->'scopes', public.items.data->'scopes', '[]'::jsonb)
  ),
  gsi1pk = excluded.gsi1pk,
  gsi1sk = excluded.gsi1sk,
  gsi2pk = excluded.gsi2pk,
  gsi2sk = excluded.gsi2sk;

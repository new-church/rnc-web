-- Enrich sample contact + add a second directory contact for admin CRM.

insert into public.items (
  pk, sk, entity_type, data, gsi1pk, gsi1sk, gsi2pk, gsi2sk, expires_at
) values (
  'MEMBER#sample-ada',
  'PROFILE',
  'member',
  jsonb_build_object(
    'displayName', 'Ada Lovelace',
    'email', 'ada.sample@example.com',
    'phone', '+61 400 000 001',
    'address', jsonb_build_object(
      'line1', '1 Analytical Engine St',
      'line2', '',
      'city', 'Roseville',
      'state', 'NSW',
      'postalCode', '2069',
      'country', 'AU'
    ),
    'tags', jsonb_build_array('sample', 'member'),
    'notes', 'Sample CRM contact from migration.',
    'mailchimpSyncedAt', null,
    'postgridSyncedAt', null,
    'createdAt', now(),
    'updatedAt', now()
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
  gsi2sk = excluded.gsi2sk;

insert into public.items (
  pk, sk, entity_type, data, gsi1pk, gsi1sk, gsi2pk, gsi2sk, expires_at
) values (
  'MEMBER#sample-julian',
  'PROFILE',
  'member',
  jsonb_build_object(
    'displayName', 'Julian Sample',
    'email', 'julian.sample@example.com',
    'phone', '+61 400 000 002',
    'address', jsonb_build_object(
      'line1', '12 Boundary St',
      'line2', '',
      'city', 'Roseville',
      'state', 'NSW',
      'postalCode', '2069',
      'country', 'AU'
    ),
    'tags', jsonb_build_array('sample', 'volunteer'),
    'notes', 'Second sample contact for admin table testing.',
    'mailchimpSyncedAt', null,
    'postgridSyncedAt', null,
    'createdAt', now(),
    'updatedAt', now()
  ),
  'EMAIL#julian.sample@example.com',
  'MEMBER',
  'DIR#rnc',
  'NAME#sample julian#sample-julian',
  null
)
on conflict (pk, sk) do update set
  entity_type = excluded.entity_type,
  data = excluded.data,
  gsi1pk = excluded.gsi1pk,
  gsi1sk = excluded.gsi1sk,
  gsi2pk = excluded.gsi2pk,
  gsi2sk = excluded.gsi2sk;

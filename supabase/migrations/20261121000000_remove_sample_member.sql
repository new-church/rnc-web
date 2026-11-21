-- Remove the sample CRM member inserted by 20260825071933_items_sample_record.sql.
-- Contacts live in Planning Center; the items table now holds app users, site settings and sync state.

delete from public.items
where pk = 'MEMBER#sample-ada'
  and sk = 'PROFILE'
  and entity_type = 'member';

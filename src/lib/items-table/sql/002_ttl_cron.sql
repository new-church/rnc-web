-- Optional: delete expired rows in batches. Enable the pg_cron extension first
-- (Supabase Dashboard → Database → Extensions → pg_cron).

create extension if not exists pg_cron;

select cron.schedule(
  'items-ttl-sweep',
  '*/5 * * * *',
  $$
  delete from public.items
  where ctid in (
    select ctid
    from public.items
    where expires_at is not null
      and expires_at <= now()
    limit 1000
  );
  $$
);

-- Unschedule:
-- select cron.unschedule('items-ttl-sweep');

-- Batch-delete expired items every 5 minutes.
-- Requires pg_cron (available on Supabase; enable in Dashboard → Database → Extensions if needed).

create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  perform cron.unschedule('items-ttl-sweep');
exception
  when others then
    null; -- job did not exist yet
end $$;

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

-- Member self-service (docs/member-self-service-design.md, Phase 0).
--
-- 1. items_incr: an atomic counter for rate limiting. The items client has put/get only, which is not atomic.
--    The counter row expires with its window (expires_at), so the existing items-ttl-sweep job cleans it up.
-- 2. A daily prune of cron.job_run_details, which pg_cron never trims (288 rows a day from the sweep job alone).

create or replace function public.items_incr(
  p_pk text,
  p_sk text,
  p_ttl_seconds integer
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.items (pk, sk, entity_type, data, expires_at)
  values (
    p_pk,
    p_sk,
    'counter',
    jsonb_build_object('count', 1),
    now() + make_interval(secs => p_ttl_seconds)
  )
  on conflict (pk, sk) do update
    set data = jsonb_build_object(
          'count',
          case
            when public.items.expires_at is not null and public.items.expires_at <= now() then 1
            else coalesce((public.items.data ->> 'count')::integer, 0) + 1
          end
        ),
        expires_at = case
          when public.items.expires_at is not null and public.items.expires_at <= now() then excluded.expires_at
          else public.items.expires_at
        end
  returning (data ->> 'count')::integer into n;
  return n;
end;
$$;

-- Server (service_role) only: the website calls this with the secret key, never from a browser.
revoke all on function public.items_incr(text, text, integer) from public, anon, authenticated;
grant execute on function public.items_incr(text, text, integer) to service_role;

do $$
begin
  perform cron.unschedule('cron-run-details-prune');
exception
  when others then
    null; -- job did not exist yet
end $$;

select cron.schedule(
  'cron-run-details-prune',
  '17 3 * * *',
  $$
  delete from cron.job_run_details
  where end_time < now() - interval '7 days';
  $$
);

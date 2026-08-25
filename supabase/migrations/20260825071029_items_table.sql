-- Single-table store: Dynamo-style PK/SK + 3 sparse GSIs + TTL.

create table if not exists public.items (
  pk text not null,
  sk text not null,
  entity_type text not null,
  data jsonb not null default '{}'::jsonb,
  gsi1pk text,
  gsi1sk text,
  gsi2pk text,
  gsi2sk text,
  gsi3pk text,
  gsi3sk text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (pk, sk)
);

create index if not exists items_gsi1
  on public.items (gsi1pk, gsi1sk, pk, sk)
  where gsi1pk is not null;

create index if not exists items_gsi2
  on public.items (gsi2pk, gsi2sk, pk, sk)
  where gsi2pk is not null;

create index if not exists items_gsi3
  on public.items (gsi3pk, gsi3sk, pk, sk)
  where gsi3pk is not null;

create index if not exists items_expires_at
  on public.items (expires_at)
  where expires_at is not null;

create or replace function public.items_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists items_touch_updated_at on public.items;
create trigger items_touch_updated_at
  before update on public.items
  for each row
  execute procedure public.items_touch_updated_at();

create or replace function public.items_get(
  p_pk text,
  p_sk text,
  p_hide_expired boolean default true
)
returns public.items
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.items
  where pk = p_pk
    and sk = p_sk
    and (
      not p_hide_expired
      or expires_at is null
      or expires_at > now()
    );
$$;

create or replace function public.items_query(
  p_index text,
  p_pk text,
  p_sk_min text default null,
  p_sk_max text default null,
  p_sk_min_inclusive boolean default true,
  p_sk_max_inclusive boolean default false,
  p_limit integer default 50,
  p_forward boolean default true,
  p_after_gsi_sk text default null,
  p_after_pk text default null,
  p_after_sk text default null,
  p_hide_expired boolean default true
)
returns setof public.items
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  part_col text;
  sort_col text;
  sql text;
  lim integer;
begin
  case p_index
    when 'table' then
      part_col := 'pk';
      sort_col := 'sk';
    when 'gsi1' then
      part_col := 'gsi1pk';
      sort_col := 'gsi1sk';
    when 'gsi2' then
      part_col := 'gsi2pk';
      sort_col := 'gsi2sk';
    when 'gsi3' then
      part_col := 'gsi3pk';
      sort_col := 'gsi3sk';
    else
      raise exception 'items_query: invalid index %', p_index;
  end case;

  lim := least(greatest(coalesce(p_limit, 50), 1), 1000);

  sql := format(
    $q$
    select *
    from public.items
    where %I = $1
      and (
        $2::text is null
        or ($3 and %I >= $2)
        or (not $3 and %I > $2)
      )
      and (
        $4::text is null
        or ($5 and %I <= $4)
        or (not $5 and %I < $4)
      )
      and (
        not $6
        or expires_at is null
        or expires_at > now()
      )
    $q$,
    part_col,
    sort_col,
    sort_col,
    sort_col,
    sort_col
  );

  if p_index = 'table' then
    if p_forward then
      sql := sql || format(' and ($7::text is null or %I > $7)', sort_col);
      sql := sql || format(' order by %I asc limit $8', sort_col);
    else
      sql := sql || format(' and ($7::text is null or %I < $7)', sort_col);
      sql := sql || format(' order by %I desc limit $8', sort_col);
    end if;
    return query execute sql
      using p_pk,
            p_sk_min,
            p_sk_min_inclusive,
            p_sk_max,
            p_sk_max_inclusive,
            p_hide_expired,
            p_after_sk,
            lim;
  else
    if p_forward then
      sql := sql || format(
        ' and ($7::text is null or (%I, pk, sk) > ($7, $8, $9)) order by %I asc, pk asc, sk asc limit $10',
        sort_col,
        sort_col
      );
    else
      sql := sql || format(
        ' and ($7::text is null or (%I, pk, sk) < ($7, $8, $9)) order by %I desc, pk desc, sk desc limit $10',
        sort_col,
        sort_col
      );
    end if;
    return query execute sql
      using p_pk,
            p_sk_min,
            p_sk_min_inclusive,
            p_sk_max,
            p_sk_max_inclusive,
            p_hide_expired,
            p_after_gsi_sk,
            p_after_pk,
            p_after_sk,
            lim;
  end if;
end;
$$;

grant select, insert, update, delete on public.items to authenticated, service_role;
grant execute on function public.items_get(text, text, boolean) to authenticated, service_role;
grant execute on function public.items_query(
  text, text, text, text, boolean, boolean, integer, boolean, text, text, text, boolean
) to authenticated, service_role;

alter table public.items enable row level security;

-- Service role bypasses RLS. Add authenticated policies before using the anon/user key.
-- See supabase/seed/rls.example.sql and docs/items-table.md.

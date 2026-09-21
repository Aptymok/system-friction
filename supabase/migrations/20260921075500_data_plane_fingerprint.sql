create or replace function public.sfi_data_plane_fingerprint()
returns table (
  table_name text,
  row_count bigint,
  hash_a numeric,
  hash_b numeric
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  r record;
  c bigint;
  a numeric;
  b numeric;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname not in (
        'sfi_data_plane_state',
        'sfi_data_plane_write_journal',
        'sfi_continuity_applied_operations'
      )
    order by c.relname
  loop
    execute format(
      'select count(*)::bigint,
              coalesce(sum(((''x'' || substr(md5(to_jsonb(t)::text),1,16))::bit(64)::bigint)::numeric),0),
              coalesce(sum(((''x'' || substr(md5(to_jsonb(t)::text),17,16))::bit(64)::bigint)::numeric),0)
       from public.%I t',
      r.relname
    ) into c, a, b;

    table_name := r.relname;
    row_count := c;
    hash_a := a;
    hash_b := b;
    return next;
  end loop;
end;
$$;

revoke all on function public.sfi_data_plane_fingerprint() from public, anon, authenticated;
grant execute on function public.sfi_data_plane_fingerprint() to service_role;

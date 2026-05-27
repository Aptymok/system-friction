do $$
declare
  seed_cte text := $seed$
with seed(edge_key, source_key, target_key, relation, weight, canvas_kind) as (
  values
    ('sfi.core:sfi.ihg_basal:structural', 'sfi.core', 'sfi.ihg_basal', 'structural', 0.9, 's'),
    ('sfi.core:sfi.nti_obs:structural', 'sfi.core', 'sfi.nti_obs', 'structural', 0.9, 's'),
    ('sfi.core:sfi.ldi_t:structural', 'sfi.core', 'sfi.ldi_t', 'structural', 0.9, 's'),
    ('sfi.core:sfi.disipacion:structural', 'sfi.core', 'sfi.disipacion', 'structural', 0.9, 's'),
    ('sfi.core:sfi.inegi_ee3:structural', 'sfi.core', 'sfi.inegi_ee3', 'structural', 0.9, 's'),
    ('sfi.core:sfi.atlas_proto:structural', 'sfi.core', 'sfi.atlas_proto', 'structural', 0.9, 's'),
    ('sfi.core:sfi.cimps_2026:structural', 'sfi.core', 'sfi.cimps_2026', 'structural', 0.9, 's'),
    ('sfi.ihg_basal:sfi.nti_obs:structural', 'sfi.ihg_basal', 'sfi.nti_obs', 'structural', 0.9, 's'),
    ('sfi.ihg_basal:sfi.perturbacion:structural', 'sfi.ihg_basal', 'sfi.perturbacion', 'structural', 0.9, 's'),
    ('sfi.nti_obs:sfi.cimps_2026:structural', 'sfi.nti_obs', 'sfi.cimps_2026', 'structural', 0.9, 's'),
    ('sfi.disipacion:sfi.unipres_pil:structural', 'sfi.disipacion', 'sfi.unipres_pil', 'structural', 0.9, 's'),
    ('sfi.ldi_t:sfi.reg_ent:structural', 'sfi.ldi_t', 'sfi.reg_ent', 'structural', 0.9, 's'),
    ('sfi.vec_div:sfi.bifurcacion:latent', 'sfi.vec_div', 'sfi.bifurcacion', 'latent', 0.45, 'l'),
    ('sfi.vec_div:sfi.pat_recur:latent', 'sfi.vec_div', 'sfi.pat_recur', 'latent', 0.45, 'l'),
    ('sfi.perturbacion:sfi.reg_ent:latent', 'sfi.perturbacion', 'sfi.reg_ent', 'latent', 0.45, 'l'),
    ('sfi.friccion_sem:sfi.trans_critica:latent', 'sfi.friccion_sem', 'sfi.trans_critica', 'latent', 0.45, 'l'),
    ('sfi.campo_lat:sfi.trans_critica:latent', 'sfi.campo_lat', 'sfi.trans_critica', 'latent', 0.45, 'l'),
    ('sfi.mem_estruc:sfi.traz_pasiva:latent', 'sfi.mem_estruc', 'sfi.traz_pasiva', 'latent', 0.45, 'l'),
    ('sfi.pat_recur:sfi.anomalia_01:latent', 'sfi.pat_recur', 'sfi.anomalia_01', 'latent', 0.45, 'l'),
    ('sfi.eps_a:sfi.perturbacion:latent', 'sfi.eps_a', 'sfi.perturbacion', 'latent', 0.45, 'l'),
    ('sfi.ihg_basal:sfi.ldi_t:resonance', 'sfi.ihg_basal', 'sfi.ldi_t', 'resonance', 0.68, 'r'),
    ('sfi.nti_obs:sfi.friccion_sem:resonance', 'sfi.nti_obs', 'sfi.friccion_sem', 'resonance', 0.68, 'r'),
    ('sfi.cimps_2026:sfi.friccion_sem:resonance', 'sfi.cimps_2026', 'sfi.friccion_sem', 'resonance', 0.68, 'r'),
    ('sfi.anomalia_01:sfi.nti_obs:resonance', 'sfi.anomalia_01', 'sfi.nti_obs', 'resonance', 0.68, 'r'),
    ('sfi.trans_critica:sfi.estab_res:resonance', 'sfi.trans_critica', 'sfi.estab_res', 'resonance', 0.68, 'r'),
    ('sfi.atlas_proto:sfi.mem_estruc:resonance', 'sfi.atlas_proto', 'sfi.mem_estruc', 'resonance', 0.68, 'r'),
    ('sfi.core:sfi.unipres_pil:resonance', 'sfi.core', 'sfi.unipres_pil', 'resonance', 0.68, 'r')
)
$seed$;
  source_col text;
  target_col text;
  source_expr text;
  target_expr text;
  from_clause text;
  duplicate_clause text;
  insert_columns text[] := array[]::text[];
  select_exprs text[] := array[]::text[];
  relation_duplicate text := '';
  edge_count integer;
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'graph_edges'
  ) then
    raise exception 'graph_edges table is missing';
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'graph_edges' and column_name = 'source_node_id')
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'graph_edges' and column_name = 'target_node_id') then
    source_col := 'source_node_id';
    target_col := 'target_node_id';
    source_expr := 'seed.source_key';
    target_expr := 'seed.target_key';
    from_clause := $sql$
from seed
where exists (select 1 from public.graph_nodes source_node where source_node.node_id = seed.source_key)
  and exists (select 1 from public.graph_nodes target_node where target_node.node_id = seed.target_key)
$sql$;
    duplicate_clause := 'ge.source_node_id = seed.source_key and ge.target_node_id = seed.target_key';
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'graph_edges' and column_name = 'source_id')
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'graph_edges' and column_name = 'target_id') then
    source_col := 'source_id';
    target_col := 'target_id';
    source_expr := 'source_node.id';
    target_expr := 'target_node.id';
    from_clause := $sql$
from seed
join public.graph_nodes source_node on source_node.node_id = seed.source_key
join public.graph_nodes target_node on target_node.node_id = seed.target_key
where true
$sql$;
    duplicate_clause := 'ge.source_id = source_node.id and ge.target_id = target_node.id';
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'graph_edges' and column_name = 'from_node_id')
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'graph_edges' and column_name = 'to_node_id') then
    source_col := 'from_node_id';
    target_col := 'to_node_id';
    source_expr := 'seed.source_key';
    target_expr := 'seed.target_key';
    from_clause := $sql$
from seed
where exists (select 1 from public.graph_nodes source_node where source_node.node_id = seed.source_key)
  and exists (select 1 from public.graph_nodes target_node where target_node.node_id = seed.target_key)
$sql$;
    duplicate_clause := 'ge.from_node_id = seed.source_key and ge.to_node_id = seed.target_key';
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'graph_edges' and column_name = 'from_id')
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'graph_edges' and column_name = 'to_id') then
    source_col := 'from_id';
    target_col := 'to_id';
    source_expr := 'source_node.id';
    target_expr := 'target_node.id';
    from_clause := $sql$
from seed
join public.graph_nodes source_node on source_node.node_id = seed.source_key
join public.graph_nodes target_node on target_node.node_id = seed.target_key
where true
$sql$;
    duplicate_clause := 'ge.from_id = source_node.id and ge.to_id = target_node.id';
  else
    raise exception 'graph_edges schema does not expose a supported source/target pair';
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'graph_edges' and column_name = 'edge_id') then
    insert_columns := array_append(insert_columns, 'edge_id');
    select_exprs := array_append(select_exprs, 'seed.edge_key');
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'graph_edges' and column_name = 'edge_key') then
    insert_columns := array_append(insert_columns, 'edge_key');
    select_exprs := array_append(select_exprs, 'seed.edge_key');
  end if;

  insert_columns := array_append(insert_columns, source_col);
  select_exprs := array_append(select_exprs, source_expr);
  insert_columns := array_append(insert_columns, target_col);
  select_exprs := array_append(select_exprs, target_expr);

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'graph_edges' and column_name = 'relation') then
    insert_columns := array_append(insert_columns, 'relation');
    select_exprs := array_append(select_exprs, 'seed.relation');
    relation_duplicate := ' and ge.relation = seed.relation';
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'graph_edges' and column_name = 'weight') then
    insert_columns := array_append(insert_columns, 'weight');
    select_exprs := array_append(select_exprs, 'seed.weight');
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'graph_edges' and column_name = 'attributes') then
    insert_columns := array_append(insert_columns, 'attributes');
    select_exprs := array_append(select_exprs, $expr$jsonb_build_object(
      'profile', 'sfi',
      'origin', 'legacy_canvas_topology',
      'provenance', 'SfiCognitiveCanvasTerminal.EDG',
      'canvasKind', seed.canvas_kind
    )$expr$);
  end if;

  execute seed_cte || format($sql$
insert into public.graph_edges (%s)
select %s
%s
  and not exists (
    select 1
    from public.graph_edges ge
    where %s%s
  )
$sql$,
    array_to_string(insert_columns, ', '),
    array_to_string(select_exprs, ', '),
    from_clause,
    duplicate_clause,
    relation_duplicate
  );

  select count(*) into edge_count from public.graph_edges;
  if edge_count = 0 then
    raise exception 'graph_edges seed produced zero rows';
  end if;
end $$;

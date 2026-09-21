create or replace function public.sfi_reconcile_canonical_graph_v1(
  p_table_name text,
  p_rows jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  applied integer := 0;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'SFI_GRAPH_BASELINE_ROWS_ARRAY_REQUIRED';
  end if;

  if p_table_name = 'graph_nodes' then
    alter table public.graph_nodes disable trigger user;

    insert into public.graph_nodes (
      id,node_key,label,node_type,profile,q_n,d_n,co_n,u_n,origin,
      epistemic_class,confidence,payload,created_at,updated_at,node_id,
      ontology_type,lineage,attributes
    )
    select
      r.id,r.node_key,r.label,r.node_type,r.profile,r.q_n,r.d_n,r.co_n,r.u_n,r.origin,
      r.epistemic_class,r.confidence,r.payload,r.created_at,r.updated_at,r.node_id,
      r.ontology_type,r.lineage,r.attributes
    from jsonb_populate_recordset(null::public.graph_nodes,p_rows) r
    on conflict (node_key) do update set
      id=excluded.id,
      label=excluded.label,
      node_type=excluded.node_type,
      profile=excluded.profile,
      q_n=excluded.q_n,
      d_n=excluded.d_n,
      co_n=excluded.co_n,
      u_n=excluded.u_n,
      origin=excluded.origin,
      epistemic_class=excluded.epistemic_class,
      confidence=excluded.confidence,
      payload=excluded.payload,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      node_id=excluded.node_id,
      ontology_type=excluded.ontology_type,
      lineage=excluded.lineage,
      attributes=excluded.attributes;

    alter table public.graph_nodes enable trigger user;
    applied := jsonb_array_length(p_rows);
    return applied;
  end if;

  if p_table_name = 'graph_edges' then
    alter table public.graph_edges disable trigger user;

    insert into public.graph_edges (
      id,source_node_key,target_node_key,relation_type,w_ij,confidence,
      evidence_ids,payload,created_at,edge_id,source_node_id,target_node_id,
      relation,weight,lineage,attributes,updated_at
    )
    select
      r.id,r.source_node_key,r.target_node_key,r.relation_type,r.w_ij,r.confidence,
      r.evidence_ids,r.payload,r.created_at,r.edge_id,r.source_node_id,r.target_node_id,
      r.relation,r.weight,r.lineage,r.attributes,r.updated_at
    from jsonb_populate_recordset(null::public.graph_edges,p_rows) r
    on conflict (source_node_key,target_node_key,relation_type) do update set
      id=excluded.id,
      w_ij=excluded.w_ij,
      confidence=excluded.confidence,
      evidence_ids=excluded.evidence_ids,
      payload=excluded.payload,
      created_at=excluded.created_at,
      edge_id=excluded.edge_id,
      source_node_id=excluded.source_node_id,
      target_node_id=excluded.target_node_id,
      relation=excluded.relation,
      weight=excluded.weight,
      lineage=excluded.lineage,
      attributes=excluded.attributes,
      updated_at=excluded.updated_at;

    alter table public.graph_edges enable trigger user;
    applied := jsonb_array_length(p_rows);
    return applied;
  end if;

  raise exception 'SFI_GRAPH_BASELINE_TABLE_NOT_ALLOWED:%', p_table_name;
end;
$$;